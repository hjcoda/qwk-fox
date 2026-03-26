import { TitleBar } from "../../features/TitleBar";
import "./StyledWindow.scss";

type WindowProps = {
  title: string;
  children: React.ReactNode;
};

export const StyledWindow = ({ title, children }: WindowProps) => {
  return (
    <div>
      <TitleBar key="title" title={title} />
      <div className="styledwindow-body">{children}</div>
    </div>
  );
};
