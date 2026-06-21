import { useState } from "react";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";

export function PageTestTabB() {
    const [field1, setField1] = useState("");
    const [field2, setField2] = useState("");

    return (
        <div className="flex flex-col gap-4 max-w-sm">
            <p className="text-muted-foreground text-xs">
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
