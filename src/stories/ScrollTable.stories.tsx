import { Meta, StoryObj } from "@storybook/react-vite";
import { ScrollTable } from "../ui/ScrollTable";

const meta: Meta<typeof ScrollTable> = {
  component: ScrollTable,
  decorators: [
    (Story) => (
      <div style={{ height: "500px" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScrollTable>;

export default meta;

type Story = StoryObj<typeof meta>;

const data = [];
for (let i = 0; i < 1000; i++) {
  data.push({
    index: i,
    data: { name: "Bob", age: `${i}` },
  });
}

export const Primary: Story = {
  args: {
    headers: [
      { accessorKey: "name", title: "Name" },
      { accessorKey: "age", title: "Age" },
    ],
    data,
    onSelectedIndexChange: () => {},
  },
};
