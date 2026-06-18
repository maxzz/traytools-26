import { type ReactNode } from "react";
import { atom } from "jotai";

export type ConfirmationUi = {
    title: string;
    icon?: ReactNode;
    message: ReactNode;
    buttonOk: string;
    buttonCancel?: string;
    isDafaultOk?: boolean;
};

export type ConfirmationData = {
    ui: ConfirmationUi;
    resolve: (ok: boolean) => void;
};

export const isOpenConfirmDialogAtom = atom<ConfirmationData | undefined>(undefined);

export const doAsyncExecuteConfirmDialogAtom = atom(
    null,
    async (_get, set, ui: ConfirmationUi): Promise<boolean> => {
        return await new Promise<boolean>(
            (resolve) => {
                set(isOpenConfirmDialogAtom, { ui, resolve });
            }
        );
    },
);
