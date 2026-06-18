import { Button } from "@/ui/shadcn/button";
import { useSetAtom } from "jotai";
import { doAsyncExecuteLoginDialogAtom } from "../../4-dialogs/8-2-login/9-types-login";
import { notice } from "@/ui/local-ui/7-toaster";

export function TestLoginDialog() {
    const doAsyncExecuteLoginDialog = useSetAtom(doAsyncExecuteLoginDialogAtom);

    async function onTestLoginDialog() {
        const result = await doAsyncExecuteLoginDialog({
            title: "Sign In to Your Account",
            description: "Please enter your credentials to access your dashboard.",
            usernameLabel: "Email Address",
            usernamePlaceholder: "you@example.com",
            passwordLabel: "Password",
            passwordPlaceholder: "••••••••",
            submitButtonText: "Sign In",
            cancelButtonText: "Cancel",
        });

        if (result) {
            notice.success(`Successfully signed in!<br/><b>Email:</b> ${result.username}<br/><b>Password:</b> ${result.password}`);
        } else {
            notice.info("Sign in cancelled");
        }
    }

    return (
        <div>
            <Button
                variant="outline"
                onClick={onTestLoginDialog}
            >
                Test Login Dialog
            </Button>
        </div>
    );
}
