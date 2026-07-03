import { useAtom } from "jotai";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";
import { tabBField1Atom, tabBField2Atom } from "./a-page-b-atoms";

export function PageTestTabB() {
    const [field1, setField1] = useAtom(tabBField1Atom);
    const [field2, setField2] = useAtom(tabBField2Atom);

    return (
        <div className="max-w-sm flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
                Tab B — type in a field, switch tabs, then return to check value and focus.
            </p>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="tab-b-field-1">Field 1</Label>
                <Input
                    id="tab-b-field-1"
                    value={field1}
                    onChange={(event) => setField1(event.target.value)}
                    placeholder="Tab B, field 1"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="tab-b-field-2">Field 2</Label>
                <Input
                    id="tab-b-field-2"
                    value={field2}
                    onChange={(event) => setField2(event.target.value)}
                    placeholder="Tab B, field 2"
                />
            </div>
        </div>
    );
}
