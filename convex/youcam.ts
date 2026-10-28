"use node";
import sharp from "sharp";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { PRODUCTS } from "./catalog";
import { SHADES } from "../src/modules/shopping/domain";
const BASE = "https://yce-api-01.makeupar.com";
async function request(path: string, body?: unknown) {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("Preview service is not configured yet.");
  const r = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok)
    throw new Error(
      r.status === 429
        ? "Preview service is busy. Please retry later."
        : `Preview service returned ${r.status}. Please try again.`,
    );
  const data = await r.json();
  if (data.status !== undefined && data.status !== 200)
    throw new Error(
      "The provider could not complete this preview. Try a clear, front-facing photo.",
    );
  return data.data;
}
export const run = internalAction({
  args: { lookId: v.id("looks"), version: v.number(), makeup: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.spaces.job, {
      lookId: args.lookId,
      version: args.version,
    });
    if (!row) return;
    try {
      const path = args.makeup ? "makeup-vto" : "cloth-v4";
      const shade = SHADES.find((s) => s.id === row.look.lipstick);
      let source = row.resultUrl;
      if (args.makeup) {
        if (!row.look.resultId)
          throw new Error("Start with a completed outfit preview.");
        const blob = await ctx.storage.get(row.look.resultId);
        if (!blob) throw new Error("Outfit preview unavailable.");
        const input = Buffer.from(await blob.arrayBuffer()),
          meta = await sharp(input).metadata();
        const w = meta.width!,
          h = meta.height!;
        const crop = await sharp(input)
          .extract({
            left: Math.floor(w * 0.25),
            top: 0,
            width: Math.floor(w * 0.5),
            height: Math.floor(h * 0.42),
          })
          .resize({ width: 1024 })
          .jpeg({ quality: 92 })
          .toBuffer();
        const cropId = await ctx.storage.store(
          new Blob([new Uint8Array(crop)], { type: "image/jpeg" }),
        );
        if (
          !(await ctx.runMutation(internal.spaces.jobPatch, {
            lookId: args.lookId,
            version: args.version,
            status: "running",
            cropId,
          }))
        )
          return;
        source = await ctx.storage.getUrl(cropId);
      }
      const body = args.makeup
        ? {
            src_file_url: source,
            version: "1.0",
            effects: [
              {
                category: "lip_color",
                shape: { name: "original" },
                style: { type: "full" },
                palettes: [
                  { color: shade?.hex, texture: "matte", colorIntensity: 65 },
                ],
              },
            ],
          }
        : {
            src_file_url: row.photoUrl,
            ref_file_url: PRODUCTS.find((p) => p.id === row.look.productId)
              ?.image,
            garment_category: "full_body",
            filter_multi_person: "strict",
          };
      const data = await request(`/s2s/v2.0/task/${path}`, body);
      if (!data?.task_id)
        throw new Error("The provider did not return a preview identifier.");
      const active = await ctx.runMutation(internal.spaces.jobPatch, {
        lookId: args.lookId,
        version: args.version,
        status: "running",
        taskId: data.task_id,
      });
      if (active)
        await ctx.scheduler.runAfter(2500, internal.youcam.poll, {
          ...args,
          path,
          attempt: 0,
        });
    } catch (e) {
      await ctx.runMutation(internal.spaces.jobPatch, {
        lookId: args.lookId,
        version: args.version,
        status: "failed",
        makeupFailed: args.makeup,
        error:
          e instanceof Error && e.name !== "TimeoutError"
            ? e.message
            : "Preview request interrupted. Your other results are safe. Retry this outfit when ready.",
      });
    }
  },
});
export const poll = internalAction({
  args: {
    lookId: v.id("looks"),
    version: v.number(),
    makeup: v.boolean(),
    path: v.string(),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.spaces.job, {
      lookId: args.lookId,
      version: args.version,
    });
    if (!row || row.look.status !== "running") return;
    try {
      if (!["cloth-v4", "makeup-vto"].includes(args.path) || args.attempt >= 60)
        throw new Error(
          "This preview took too long. Your other results are safe; you can retry this outfit.",
        );
      const data = await request(
        `/s2s/v2.0/task/${args.path}/${encodeURIComponent(row.look.taskId!)}`,
      );
      if (data.task_status === "error")
        throw new Error(
          "YouCam could not process this photo. Try a clear photo showing your face and outfit.",
        );
      if (data.task_status !== "success") {
        await ctx.scheduler.runAfter(3000, internal.youcam.poll, {
          ...args,
          attempt: args.attempt + 1,
        });
        return;
      }
      const value = data.results?.url;
      const url = new URL(Array.isArray(value) ? value[0] : value);
      if (
        url.protocol !== "https:" ||
        url.hostname === "localhost" ||
        /^\d+\./.test(url.hostname)
      )
        throw new Error("The provider returned an invalid preview.");
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!response.ok)
        throw new Error("Could not retrieve this preview. Try again.");
      const type = response.headers.get("content-type") ?? "";
      if (
        Number(response.headers.get("content-length") ?? 0) >
        15 * 1024 * 1024
      )
        throw new Error("Preview format was not supported.");
      const blob = await response.blob();
      if (blob.size > 15 * 1024 * 1024)
        throw new Error("Preview file was too large.");
      const bytes = Buffer.from(await blob.arrayBuffer());
      const metadata = await sharp(bytes, {
        limitInputPixels: 20000000,
      }).metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
        throw new Error("Preview was not a supported image.");
      const normalized = new Blob([new Uint8Array(bytes)], {
        type:
          metadata.format === "jpeg"
            ? "image/jpeg"
            : `image/${metadata.format}`,
      });
      const resultId = await ctx.storage.store(normalized);
      await ctx.runMutation(internal.spaces.jobPatch, {
        lookId: args.lookId,
        version: args.version,
        status: "complete",
        ...(args.makeup ? { detailId: resultId } : { resultId }),
      });
    } catch (e) {
      if (
        args.attempt < 4 &&
        e instanceof Error &&
        ["TimeoutError", "TypeError"].includes(e.name)
      ) {
        await ctx.scheduler.runAfter(5000, internal.youcam.poll, {
          ...args,
          attempt: args.attempt + 1,
        });
        return;
      }
      await ctx.runMutation(internal.spaces.jobPatch, {
        lookId: args.lookId,
        version: args.version,
        status: "failed",
        makeupFailed: args.makeup,
        error: args.makeup
          ? "Lipstick preview could not finish. Your outfit preview is kept; try a clearer photo or another shade."
          : e instanceof Error
            ? e.message
            : "Preview interrupted. Retry this outfit when ready.",
      });
    }
  },
});
