import React from "react";
import Avatar, { ConfigProvider } from "react-avatar";

const Client = (props) => {
  return (
    <ConfigProvider >
      <div className="client">
        <Avatar name={props.userName} size={45} round="15px" />
        <span className="username">{props.userName}</span>
      </div>
    </ConfigProvider>
  );
};
export default Client;
