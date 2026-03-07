export const GroupBox = ({
  title,
  children,
  layout,
}: {
  title: string;
  children: React.ReactElement;
  layout?: "expand";
}) => {
  const classNames = [];
  if (layout === "expand") {
    classNames.push("expand-contents");
  }

  return (
    <fieldset className={classNames.join(" ")}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
};
