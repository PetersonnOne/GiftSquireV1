import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { membership } from "./model/access";
import { viewer } from "./validators";
export const current = query({
  args: {},
  returns: viewer,
  handler: async (ctx) => {
    if (!(await getAuthUserId(ctx))) return null;
    const { user, role, permissions } = await membership(ctx);
    return {
      id: user._id,
      name: user.name || "GiftSquire member",
      email: user.email || "",
      role,
      permissions,
      isAnonymous: user.isAnonymous === true,
    };
  },
});
