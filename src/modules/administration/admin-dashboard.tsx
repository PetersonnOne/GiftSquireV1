"use client";
import Link from "next/link";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  can,
  permissions,
  type Permission,
} from "@/modules/identity/permissions";
import { themes, type Theme } from "@/modules/appearance/themes";
export function AdminDashboard() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.identity.current, isAuthenticated ? {} : "skip");
  const [tab, setTab] = useState("overview");
  if (isLoading || (isAuthenticated && user === undefined))
    return <div className="skeleton sk-card" />;
  if (!user)
    return (
      <section className="panel">
        <h1>Administration</h1>
        <p>Sign in with an authorized account to continue.</p>
        <Link className="button" href="/sign-in">
          Sign in
        </Link>
      </section>
    );
  if (user.role === "member")
    return (
      <section className="panel">
        <span className="badge">RESTRICTED ACCESS</span>
        <h1>This space is for your site team.</h1>
        <p>
          Your account does not have an administration role. Access is checked
          in the database functions as well as this screen.
        </p>
        <Link href="/account" className="button outline">
          Back to your account
        </Link>
      </section>
    );
  const allowed = (p: Permission) => can(user.role, user.permissions, p);
  const tabs = [
    ["overview", "Overview"],
    ...(allowed("members.manage") ? [["members", "People & access"]] : []),
    ...(user.role === "superadmin" ? [["appearance", "Appearance"]] : []),
    ...(allowed("audit.read") ? [["audit", "Audit trail"]] : []),
  ];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">GIFTSQUIRE / ADMINISTRATION</span>
        <h1>A thoughtful platform starts here.</h1>
        <p>
          Manage the experience with access scoped to your responsibilities.
        </p>
      </div>
      <div className="admin-layout">
        <aside className="admin-nav" aria-label="Administration sections">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
              <span>↗</span>
            </button>
          ))}
          <div className="admin-identity">
            <span className="avatar">{user.name[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
          </div>
        </aside>
        <div className="admin-content">
          {tab === "overview" && (
            <>
              <section className="panel admin-welcome">
                <span className="badge">FOUNDATION</span>
                <h2>One place to care for the whole experience.</h2>
                <p>
                  Changes to staff access and themes are recorded in the
                  database audit trail. Your permission set controls which
                  sections you can use.
                </p>
                <div className="chips">
                  {user.role === "superadmin" ? (
                    <span className="badge">All modules</span>
                  ) : (
                    user.permissions.map((p) => (
                      <span className="badge" key={p}>
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </section>
              {allowed("spaces.read") && <Operations />}
              <div className="dashboard-grid">
                <section className="panel">
                  <span className="card-number">01</span>
                  <h3>People & access</h3>
                  <p>
                    Grant normal admin roles with only the permissions they
                    need.
                  </p>
                  <span className="badge">
                    {allowed("members.manage")
                      ? "Access enabled"
                      : "Restricted"}
                  </span>
                </section>
                <section className="panel">
                  <span className="card-number">02</span>
                  <h3>Site appearance</h3>
                  <p>
                    Site defaults update through live subscriptions. Personal
                    themes stay personal.
                  </p>
                  <span className="badge">
                    {user.role === "superadmin"
                      ? "Access enabled"
                      : "Superadmin only"}
                  </span>
                </section>
                <section className="panel">
                  <span className="card-number">03</span>
                  <h3>Audit trail</h3>
                  <p>
                    Review who changed what, when, and the outcome of the
                    operation.
                  </p>
                  <span className="badge">
                    {allowed("audit.read") ? "Access enabled" : "Restricted"}
                  </span>
                </section>
              </div>
            </>
          )}
          {tab === "members" && allowed("members.manage") && (
            <Members
              actorRole={user.role}
              actorPermissions={user.permissions}
            />
          )}
          {tab === "appearance" && user.role === "superadmin" && (
            <SiteAppearance />
          )}
          {tab === "audit" && allowed("audit.read") && <AuditTrail />}
        </div>
      </div>
    </>
  );
}
function SiteAppearance() {
  const site = useQuery(api.appearance.site);
  const setSite = useMutation(api.appearance.setSite);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <span className="eyebrow">LOOK & FEEL</span>
      <h2>Set the mood for GiftSquire.</h2>
      <p>
        Choose the default palette. Everyone following the site default sees the
        change through Convex subscriptions; personal overrides remain in place.
      </p>
      <div className="theme-cards">
        {themes.map((t) => (
          <button
            key={t.id}
            className={`theme-card ${site?.theme === t.id ? "selected" : ""}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage("");
              try {
                await setSite({ theme: t.id as Theme });
                setMessage(`${t.name} is now the site default.`);
              } catch {
                setMessage("The default theme could not be changed.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <span className={`palette ${t.id}`}>
              <i />
              <i />
              <i />
            </span>
            <strong>{t.name}</strong>
            <small>{t.shades}</small>
            <span className="badge">
              {site?.theme === t.id ? "Current default" : "Set as default"}
            </span>
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </section>
  );
}
function Members({
  actorRole,
  actorPermissions,
}: {
  actorRole: "admin" | "superadmin";
  actorPermissions: readonly string[];
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.administration.members,
    {},
    { initialNumItems: 15 },
  );
  const save = useMutation(api.administration.setAdmin);
  const [editing, setEditing] = useState<Id<"users"> | null>(null);
  const [selected, setSelected] = useState<Permission[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PEOPLE & ACCESS</span>
          <h2>The right access for the right person.</h2>
        </div>
        <span className="badge">{results.length} loaded</span>
      </div>
      <p>
        People create their own accounts; authorized staff can then assign
        normal admin access. Superadmin accounts cannot be changed here.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Role</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                </td>
                <td>
                  <span className="badge">{user.role}</span>
                </td>
                <td>{user.permissions.join(", ") || "—"}</td>
                <td>
                  {user.role !== "superadmin" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing(user.id);
                        setSelected(user.permissions);
                      }}
                    >
                      Manage
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status === "CanLoadMore" && (
        <button className="button outline" onClick={() => loadMore(15)}>
          Load more people
        </button>
      )}
      {editing && (
        <form
          className="access-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              await save({
                userId: editing,
                permissions: selected,
                enabled: true,
              });
              setMessage("Admin access updated.");
              setEditing(null);
            } catch {
              setMessage(
                "Access could not be changed. Your role may not permit this change.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Assign normal admin permissions</h3>
          {permissions
            .filter(
              (p) => actorRole === "superadmin" || actorPermissions.includes(p),
            )
            .map((p) => (
              <label className="checkbox" key={p}>
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, p]
                        : selected.filter((x) => x !== p),
                    )
                  }
                />
                {p}
              </label>
            ))}
          <div className="actions">
            <button className="button" disabled={busy}>
              Save admin access
            </button>
            <button
              className="button outline"
              disabled={busy}
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  await save({
                    userId: editing,
                    permissions: [],
                    enabled: false,
                  });
                  setEditing(null);
                  setMessage("Admin access revoked.");
                } catch {
                  setMessage("Access could not be revoked.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Revoke admin
            </button>
            <button
              className="text-button"
              type="button"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
function AuditTrail() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.administration.audits,
    {},
    { initialNumItems: 20 },
  );
  return (
    <section className="panel">
      <span className="eyebrow">A CLEAR RECORD</span>
      <h2>Every important change has a trail.</h2>
      <p>
        Metadata only. Passwords, API keys, health details, and complete
        provider responses are excluded.
      </p>
      {!results.length && status !== "LoadingFirstPage" ? (
        <div className="empty-state">
          No audit events yet. Changes to themes and staff access will appear
          here.
        </div>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Event / outcome</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {results.map((event) => (
                <tr key={event._id}>
                  <td>{new Date(event._creationTime).toLocaleString()}</td>
                  <td>
                    <strong>{event.action}</strong>
                    <span className="badge">{event.outcome}</span>
                  </td>
                  <td>
                    <code>{event.actorId || "System"}</code>
                  </td>
                  <td>
                    {event.summary}
                    <small>{event.requestId}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "CanLoadMore" && (
        <button className="button outline" onClick={() => loadMore(20)}>
          Load earlier events
        </button>
      )}
    </section>
  );
}

function Operations() {
  const data = useQuery(api.operations.overview);
  return (
    <section className="panel">
      <span className="eyebrow">GIFTSQUIRE OPERATIONS</span>
      <h2>Activity at a glance</h2>
      <p className="fine">
        Recent records: up to 200 spaces, 600 previews, 200 voice sessions and
        200 briefs. Counts are a bounded activity snapshot.
      </p>
      {!data ? (
        <p>Loading…</p>
      ) : (
        <div className="dashboard-grid">
          {[
            ["Active spaces", data.spaces],
            ["Ready previews", data.previews],
            ["Jobs in progress", data.running],
            ["Failed previews", data.failed],
            ["Voice pending cleanup / active", data.voiceActive],
            ["Emails accepted", data.emailsAccepted],
          ].map(([label, n]) => (
            <div key={label}>
              <strong>{n}</strong>
              <p>{label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
