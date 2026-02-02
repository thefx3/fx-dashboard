//login/page.tsx

import { redirect } from "next/navigation";
import LoginForm from "./LoginForm"
import { getViewerServer } from "@/lib/auth/viewer.server";

export default async function Login() {
    // const { user } = await getViewerServer();
    // if (user) redirect("/");

    return (
        <LoginForm />
    )
}