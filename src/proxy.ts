import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
// Session transport only. Authorization is independently enforced in every Convex function.
export default convexAuthNextjsMiddleware();
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api)(.*)"],
};
