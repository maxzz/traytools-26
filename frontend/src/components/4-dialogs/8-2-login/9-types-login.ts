import { atom } from "jotai";

export type LoginCredentials = {
    username: string;
    password: string;
};

export type LoginUi = {
    title: string;
    description?: string;
    usernameLabel?: string;
    passwordLabel?: string;
    usernamePlaceholder?: string;
    passwordPlaceholder?: string;
    submitButtonText?: string;
    cancelButtonText?: string;
};

export type LoginDialogData = {
    ui: LoginUi;
    resolve: (credentials: LoginCredentials | null) => void;
};

export const isOpenLoginDialogAtom = atom<LoginDialogData | undefined>(undefined);

export const doAsyncExecuteLoginDialogAtom = atom(
    null,
    async (_get, set, ui: LoginUi): Promise<LoginCredentials | null> => {
        return await new Promise<LoginCredentials | null>(
            (resolve) => {
                set(isOpenLoginDialogAtom, { ui, resolve });
            }
        );
    },
);
