import { TitleBar } from "../../features/titlebar/TitleBar";
import { MenuData, StyledMenu } from "../StyledMenu/StyledMenu";
import "./StyledWindow.scss";

type WindowProps = {
  title: string;
  menuData?: MenuData;
  children: React.ReactNode;
};

export const StyledWindow = ({ title, menuData, children }: WindowProps) => {
  return (
    <>
      <TitleBar key="title" title={title} />
      {menuData && <StyledMenu data={menuData} />}
      <div className="styledwindow-body">{children}</div>
    </>
  );
};
