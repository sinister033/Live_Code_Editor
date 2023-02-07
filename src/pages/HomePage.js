import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const [newRoomId, setNewRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const roomIdHandler = (event) => {
    event.preventDefault();
    const id = uuid();
    setNewRoomId(id);
    toast.success("ROOM ID Created!", { autoClose: 1500 });
  };
  const joinRoomHandler = () => {
    if (!newRoomId && !userName) {
      toast.error("ROOM ID and Username is required");
      return;
    }
    if (!newRoomId) {
      toast.error("ROOM ID is Required");
      return;
    }
    if (!userName) {
      toast.error("Username is Required");
      return;
    }
    navigate(`/editor/${newRoomId}`, {
      state: {
        userName: userName,
        roomId:newRoomId
      },
    });
  };
  const enterPressHandler=(event)=>{
      // console.log(event.code);
      if(event.code==="Enter"){
        joinRoomHandler();
      }
  }

  return (
    <div className="homePage">
      <div className="formContent">
        <img className="logoImg" src="/code1.png" alt="code"></img>
        <h4 className="mainLabel">Enter invitation ROOM ID</h4>
        <div className="inputGang">
          <input
            type="text"
            placeholder="ROOM ID"
            className="inputBox"
            value={newRoomId}
            onChange={(event) => {
              setNewRoomId(event.target.value);
            }}
            onKeyUp={enterPressHandler}
          />
          <input
            type="text"
            placeholder="USERNAME"
            className="inputBox"
            onChange={(event) => {
              setUserName(event.target.value);
            }}
            value={userName}
            onKeyUp={enterPressHandler}
          />
          <button onClick={joinRoomHandler} className="btn btn-join">
            {" "}
            Join
          </button>
          <span className="createInfo">
            {" "}
            Don't have an invite, then create your own &nbsp;
            <a onClick={roomIdHandler} href="/" className="createNewRoom">
              new room
            </a>
          </span>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
