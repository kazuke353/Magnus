import { useSubmit } from "@remix-run/react";
import Select from "~/components/Select";
import type { SelectOption } from "~/components/Select";

interface ModelSelectorProps {
  models: Array<{ name: string; index: number }>;
  currentModelIndex: number;
}

export default function ModelSelector({ models, currentModelIndex }: ModelSelectorProps) {
  const submit = useSubmit();
  if (!models) {
    return null;
  }
  
  const selectOptions: SelectOption[] = models.map((model) => ({
    value: model.index.toString(),
    label: model.name,
  }));
  
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelIndex = e.target.value;
    
    const formData = new FormData();
    formData.append("_action", "switch_model");
    formData.append("model", modelIndex);
    
    submit(formData, { method: "post" });
  };
  
  return (
    <div>
      <Select
        id="model-selector"
        value={currentModelIndex.toString()}
        onChange={handleModelChange}
        options={selectOptions}
      />
    </div>
  );
}
