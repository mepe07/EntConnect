import { CheckboxComponent } from "~/components/checkbox/checkbox.component";
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
import { useState } from "react";
import { TextareaComponent } from "~/components/textarea/textarea.component";

export function TestComponents() {
  const [inputValue, setInputValue] = useState("");
  const [selectedOption, setSelectedOption] = useState("option2");
  const [isChecked, setIsChecked] = useState(true);
  const [textAreaValue, setTextAreaValue] = useState("");

  return (
    <>
      <InputComponent
        id="username"
        label="Username"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
      />
      <br />
      <SelectBoxComponent
        id="options"
        label="Options"
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" }
        ]}
        selectedOption={selectedOption}
        onChange={e => setSelectedOption(e.target.value)}
      />
      <br />
      <CheckboxComponent
        id="checkbox1"
        label="Check me"
        selected={isChecked}
        // @ts-ignore: CheckboxComponent does not accept onChange, but it manages its own state
        onChange={e => setIsChecked(e.target.checked)}
      />
      <br />
      <TextareaComponent
        id="description"
        label="Textarea"
        value={textAreaValue}
        onChange={e => setTextAreaValue(e.target.value)}
      />

    </>
  );
}
