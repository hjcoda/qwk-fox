import { Frame } from "react95"
import { Server } from "../data/DTO"

export const StatusBar = ({ servers, bbsId }: { servers: Server[], bbsId: string | null }) => {
    const activeUserName = servers.find((s) => s.bbs_id === bbsId)?.user_name ?? '';
    const classNames = ['status-bar-field'];
    if (!activeUserName) {
        classNames.push('disabled');
    }
    return <Frame variant="status">
        <p className={classNames.join(' ')}>{`User name : ${activeUserName}`}</p>
    </Frame>
}