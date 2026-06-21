import { useState } from "react";
import { Input } from "@/ui/shadcn/input";
import { Label } from "@/ui/shadcn/label";

export function PageTestTabA() {
    const [field1, setField1] = useState("");
    const [field2, setField2] = useState("");

    return (
        <div className="flex flex-col gap-4 max-w-sm">
            <p className="text-muted-foreground text-xs">
                Tab A — type in a field, switch tabs, then return to check value and focus.
            </p>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="tab-a-field-1">Field 1</Label>
                <Input
                    id="tab-a-field-1"
                    value={field1}
                    onChange={(event) => setField1(event.target.value)}
                    placeholder="Tab A, field 1"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="tab-a-field-2">Field 2</Label>
                <Input
                    id="tab-a-field-2"
                    value={field2}
                    onChange={(event) => setField2(event.target.value)}
                    placeholder="Tab A, field 2"
                />
            </div>
        </div>
    );
}
