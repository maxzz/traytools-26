import { useState, type SubmitEvent } from "react";
import { useAtom } from "jotai";
import { Button } from "@/ui/shadcn/button";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/shadcn/dialog";
import { isOpenLoginDialogAtom, type LoginDialogData } from "./9-types-login";

export function LoginDialog() {
    const [loginData, setLoginData] = useAtom(isOpenLoginDialogAtom);
    if (!loginData) {
        return null;
    }

    const currentLoginData = loginData;

    function onDlgClose(success: boolean, username = "", password = "") {
        setLoginData(undefined);
        if (success) {
            currentLoginData.resolve({ username, password });
        } else {
            currentLoginData.resolve(null);
        }
    }

    return (
        <Dialog open={!!currentLoginData} onOpenChange={() => onDlgClose(false)}>
            <DialogContent className="max-w-sm! gap-0! p-0!" aria-describedby={DESCRIPTION_ID} modal>
                <DialogHeader className="gap-0 border-b px-4 py-3 text-left">
                    <DialogTitle className="text-sm">
                        {currentLoginData.ui.title}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {currentLoginData.ui.description || "Please enter your login details."}
                    </DialogDescription>
                </DialogHeader>

                <Body loginDialogData={currentLoginData} onDlgClose={onDlgClose} />
            </DialogContent>
        </Dialog>
    );
}

function Body({ loginDialogData, onDlgClose }: { loginDialogData: LoginDialogData; onDlgClose: (success: boolean, username?: string, password?: string) => void; }) {
    const { ui } = loginDialogData;
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (!username.trim()) {
            setError("Username/Email is required");
            return;
        }
        if (!password) {
            setError("Password is required");
            return;
        }
        setError("");
        onDlgClose(true, username, password);
    }

    return (
        <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-4">
            {ui.description && (
                <div className="text-xs text-muted-foreground leading-normal">
                    {ui.description}
                </div>
            )}

            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="login-username">
                        {ui.usernameLabel || "Username or Email"}
                    </Label>
                    <Input
                        id="login-username"
                        type="text"
                        placeholder={ui.usernamePlaceholder || "Enter username..."}
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setError("");
                        }}
                        autoFocus
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="login-password">
                        {ui.passwordLabel || "Password"}
                    </Label>
                    <Input
                        id="login-password"
                        type="password"
                        placeholder={ui.passwordPlaceholder || "Enter password..."}
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                        }}
                    />
                </div>
            </div>

            {error && (
                <div className="text-xs text-destructive font-medium">
                    {error}
                </div>
            )}

            <DialogFooter className="pt-2 flex flex-row justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onDlgClose(false)}
                    className="min-w-16"
                >
                    {ui.cancelButtonText || "Cancel"}
                </Button>
                <Button
                    type="submit"
                    variant="default"
                    className="min-w-16"
                >
                    {ui.submitButtonText || "Login"}
                </Button>
            </DialogFooter>
        </form>
    );
}

const DESCRIPTION_ID = "login-dialog-description";
