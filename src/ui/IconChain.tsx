import { Tooltip } from "react-tooltip";
import { Frame } from "react95";
import "./IconChain.css";

export type IconItem = {
  index: string;
  title: string;
  iconSrc: string;
  tooltip: string;
  disabled?: boolean;
};
export const IconChain = ({
  selectedIndex,
  onSelectedIndexChanged,
  data,
}: {
  selectedIndex: string | null;
  onSelectedIndexChanged: (index: string) => void;
  data: IconItem[];
}) => {
  return (
    <Frame
      className="icon-chain-container"
      variant="field"
      style={{
        marginTop: "2px",
        padding: "1px",
      }}
    >
      <div className="icon-chain">
        {data.map((item) => {
          const { index, iconSrc, title, tooltip, disabled } = item;
          const classNames = ["icon"];
          if (selectedIndex === index) {
            classNames.push("selected");
          }
          if (disabled) {
            classNames.push("disabled");
          }
          return (
            <>
              <div
                className={classNames.join(" ")}
                id={title}
                onClick={() => onSelectedIndexChanged(index)}
              >
                <img src={iconSrc} width={64} height={64} alt={title} />
                <div>{title}</div>
              </div>
              <Tooltip
                className="on-top"
                anchorSelect={`#${title}`}
                content={tooltip}
              />
            </>
          );
        })}
      </div>
    </Frame>
  );
};
