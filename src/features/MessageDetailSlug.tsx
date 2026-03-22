import { Button } from "react95";
import { Message } from "../data/DTO";
import "./MessageDetailSlug.css";

type MessageDetailSlugProps = {
  message: Message | null;
  onFontSizeDecrease?: () => void;
  onFontSizeIncrease?: () => void;
  fontSize?: number;
  minFontSize?: number;
  maxFontSize?: number;
};

export const MessageDetailSlug = ({
  message,
  onFontSizeDecrease,
  onFontSizeIncrease,
  fontSize,
  minFontSize,
  maxFontSize,
}: MessageDetailSlugProps) => {
  const canDecrease =
    minFontSize === undefined || fontSize === undefined
      ? true
      : fontSize > minFontSize;
  const canIncrease =
    maxFontSize === undefined || fontSize === undefined
      ? true
      : fontSize < maxFontSize;

  return (
    <div className="message-detail-slug">
      <div className="message-detail-slug-item">
        <div>{`From:`}</div>
        <div>{message?.from}</div>
        <div>{`To:`}</div>
        <div>{message?.to}</div>
        <div>{`Subject:`}</div>
        <div>{message?.subject}</div>
      </div>
      <div className="message-detail-slug-item">
        <div>{`Sent:`}</div>
        <div>{message?.date}</div>
        {message?.header?.x_ftn_chrs && (
          <>
            <div>{`Encoding:`}</div>
            <div>{message?.header?.x_ftn_chrs}</div>
          </>
        )}
      </div>
    </div>
  );
};
