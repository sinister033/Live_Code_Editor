import React, { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import ACTIONS from "../Actions";
import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { toast } from "react-toastify";

const EditorPage = () => {
  const socketRef = useRef(null);
  const location = useLocation();
  const params = useParams();
  const navigator = useNavigate();
  const codeRef = useRef(null);
  // console.log(params);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      //if some error happened while connecting to websockets we have to handle errors

      socketRef.current.on("connect_error", (err) => {
        errorHandler(err);
      });
      socketRef.current.on("connect_failed", (err) => {
        errorHandler(err);
      });

      const errorHandler = (err) => {
        console.log("socket error", err);
        toast.error("Error in Socket Connection!");
        navigator("/");
      };
      socketRef.current.emit(ACTIONS.JOIN, {
        roomId: params.roomId,
        userName: location.state?.userName,
      });
      // for joined event of newUser
      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, userName, socketId }) => {
          if (userName !== location.state?.userName) {
            toast.info(`${userName} has joined the Room!`);
            console.log(`${userName} has joined`);
          }
          setClients(clients);
          // for a new user who has joined now when some code has already been written.
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            codeInput: codeRef.current,
            socketId,
          });
        }
      );
      //for disconnecting event of user who left the room
      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
        toast.info(`${userName} has left the room`);
        setClients((prevstate) => {
          return prevstate.filter((client) => client.socketId !== socketId);
        });
      });
    };
    init();
    return () => {
      socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyRoomIdHandler = async () => {
    
    //Clipboard api doesn't working it is giving undefined writetext that's why 
    //we used document.execCommand("copy") to store roomId in clipboard


    // if (!navigator.clipboard) {
    //   console.log("not available");
    // }
    // try {
    //   await navigator.clipboard.writeText(params.roomId);
    //   toast.success("ROOM ID has been copied!");
    // } catch (err) {
    //   toast.error("Could not copy the Room ID");
    //   console.error(err);
    // }
    let textArea = document.createElement("textarea");
    textArea.value = params.roomId;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("ROOM ID has been copied");
      // let msg = successful ? "successful" : "unsuccessful";
      // console.log("Copying text command was " + msg);
    } catch (err) {
      // console.log(err);
      toast.error("Unable to copy ROOM ID");
    }
    document.body.removeChild(textArea);
  };
  const leaveRoomHandler = () => {
    navigator("/");
  };

  if (!location.state) {
    return <Navigate to="/" />;
  }
  return (
    <div className="mainWrapper">
      <div className="left-part">
        <div className="left-part-inner">
          <div className="editor-logo">
            <img className="editor-logoImg" src="/code1.png" alt="code" />
          </div>
          <h3>Connected</h3>
          <div className="clients-list">
            {clients.map((client) => {
              return (
                <Client userName={client.userName} key={client.socketId} />
              );
            })}
          </div>
        </div>
        <button className="btn copyBtn" onClick={copyRoomIdHandler}>
          Copy ROOM ID
        </button>
        <button className="btn leaveBtn" onClick={leaveRoomHandler}>
          Leave Room
        </button>
      </div>
      <div className="editorWrapper">
        <Editor
          socketRef={socketRef}
          roomId={params.roomId}
          onCodeChange={(codeInput) => {
            codeRef.current = codeInput;
          }}
        />
      </div>
    </div>
  );
};

export default EditorPage;
