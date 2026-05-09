import { CheckboxComponent } from "~/components/checkbox/checkbox.component";
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
import { useState } from "react";
import { TextareaComponent } from "~/components/textarea/textarea.component";
import { TableComponent } from "~/components/table/table.component";
import { ButtonComponent } from "~/components/button/button.component";
import { ButtonTypeEnum } from "~/components/button/models/enums/button-type.enum";
import { ButtonColorEnum } from "~/components/button/models/enums/button-color.enum";
import { SizeEnum } from "~/components/models/enums/size.enum";
import { TableColumnTypesEnum } from "~/components/table/models/enums/table-column-types.enum";
import { InfoTypesEnum } from "~/components/models/enums/info-types.enum";
import { CardComponent } from "~/components/card/card.component";
import { CardTypeEnum } from "~/components/card/models/enums/card-type.enum";

import { showToast } from '~/components/toast/toast';
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
      <br />
      <ButtonComponent
        label="Edit"
        icon="fa-pen-to-square"
        config={{ type: ButtonTypeEnum.Primary, size: SizeEnum.Regular }}
        onClick={() => showToast("Button clicked!")} />
      <ButtonComponent
        label="Edit"
        icon="fa-pen-to-square"
        config={{ type: ButtonTypeEnum.Secondary, size: SizeEnum.Regular }}
        onClick={() => showToast("Button clicked!")} />
      <ButtonComponent
        label="Edit"
        icon="fa-pen-to-square"
        config={{ type: ButtonTypeEnum.Tertiary, size: SizeEnum.Regular }}
        onClick={() => showToast("Button clicked!")} />
      <br />
      <br />
      <CardComponent title="Test Card" description="This is a simple test card." type={CardTypeEnum.Warning} />
      <CardComponent title="Test Card" description="This is a simple test card." type={CardTypeEnum.Error} />
      <br />
      <br />
      <TableComponent
        config={{
          columns: [
            { key: "name", value: "Name", type: TableColumnTypesEnum.Default },
            { key: "email", value: "Email", type: TableColumnTypesEnum.Default },
            { key: "debt", value: "Dívida", type: TableColumnTypesEnum.ChipMoney }
          ],
          filters: [
            {
              key: "debt",
              value: "",
              options: [
                { value: "", label: "All" },
                { value: "1000", label: "1000" },
                { value: "2000", label: "2000" },
                { value: "3000", label: "3000" }
              ]
            },
            {
              key: "email",
              value: "",
              options: [
                { value: "", label: "All" },
                { value: "john.doe@example.com", label: "example.com" }
              ]
            }
          ],
          actions: [
            {
              icon: "fa-trash",
              tooltip: "Eliminar",
              config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error },
              onClick: (row) => showToast(`Delete ${row.name}`)
            },
            {
              icon: "fa-eye",
              tooltip: "Ver",
              config: { type: ButtonTypeEnum.Tertiary },
              onClick: (row) => showToast(`View ${row.name}`)
            }
          ]
        }}
        data={[
          { name: "John Doe", email: "john.doe@example.com", debt: {value: "2", infoType: InfoTypesEnum.Info } },
          { name: "Jane Smith", email: "jane.smith@example.com", debt: {value: "33.44", infoType: InfoTypesEnum.Warning } },
          { name: "Bob Johnson", email: "bob.johnson@example.com", debt: {value: "3000", infoType: InfoTypesEnum.Error } }
        ]}
      />

    </>
  );
}
