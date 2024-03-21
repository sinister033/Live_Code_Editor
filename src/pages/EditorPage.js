import React, { useEffect, useRef, useState } from "react";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import ACTIONS from "../utils/Actions";
import Select from "react-select";
import axios from "axios";
import "codemirror/theme/ayu-mirage.css";
import "codemirror/theme/nord.css";
import "codemirror/theme/monokai.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/ambiance.css";
import "codemirror/theme/material-palenight.css";
import "codemirror/theme/yonce.css";
import "codemirror/theme/night.css";
import "codemirror/theme/duotone-dark.css";
import "codemirror/theme/darcula.css";
import { headers } from "../utils/headers";

import { themes } from "../utils/Themes";
import {
  useLocation,
  useParams,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { toast } from "react-toastify";
import { languages } from "../utils/Languages";
const EditorPage = () => {
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const selectRef = useRef(null);
  const outputRef = useRef(null);
  const location = useLocation();
  const params = useParams();
  const navigator = useNavigate();
  const codeRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[1]);
  const [theme, setTheme] = useState(themes[1]);
  const [output, setOutput] = useState("");
  const [isError, setIserror] = useState(false);

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
      socketRef?.current.emit(ACTIONS.JOIN, {
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

          // for a new user who has joined now, when some code has already been written.
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            codeInput: codeRef.current,
            socketId,
          });

          socketRef.current.on(ACTIONS.INPUT_CHANGE, ({ input }) => {
            if (input !== null) inputRef.current.value = input;
          });

          socketRef.current.emit(ACTIONS.SYNC_INPUT, {
            input: inputRef?.current?.value,
            socketId,
          });
          socketRef.current.on(ACTIONS.OUTPUT_CHANGE, ({ stdOut }) => {
            // console.log(stdOut);
            if (stdOut !== null) {
              outputRef.current.value = stdOut;
            }
          });
          socketRef.current.emit(ACTIONS.SYNC_OUTPUT, {
            output: outputRef.current.value,
            socketId,
          });
          socketRef.current.emit(ACTIONS.SYNC_SELECT, {
            lang: selectedLanguage,
            defaultLang: languages[1],
            roomId: params.roomId,
            socketId,
          });
          socketRef?.current.on(ACTIONS.SELECTED, ({ lang }) => {
            // console.log(lang);
            if (lang !== null)
              setSelectedLanguage({ id: lang?.id, label: lang?.label });
          });
        }
      );

      //for disconnecting the event of user who left the room
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
  }, []);
  useEffect(() => {

    outputHandler();

  }, [output]);

  let outputHandler = () => {
    if (socketRef.current) {
      socketRef.current.emit(ACTIONS.OUTPUT_CHANGE, {
        output: outputRef.current.value,
        roomId: params.roomId,
      });
      socketRef.current.on(ACTIONS.OUTPUT_CHANGE, ({ stdOut }) => {
        outputRef.current.value = stdOut;
      });
    }
  };
  const inputHandler = () => {
    socketRef.current.emit(ACTIONS.INPUT_CHANGE, {
      input: inputRef.current.value,
      roomId: params.roomId,
    });
    socketRef.current.on(ACTIONS.INPUT_CHANGE, ({ input }) => {
      inputRef.current.value = input;
    });
  };
  const inputChangeHandler = (lang, theme) => {
    // console.log(socketRef, lang, theme);

    socketRef.current?.emit(ACTIONS.SELECT_CHANGE, {
      lang: lang,
      roomId: params.roomId,
    });

    socketRef.current?.on(ACTIONS.SELECTED, ({ lang }) => {
      // console.log(lang);
      setSelectedLanguage({ id: lang.id, label: lang.label });
      // selectRef.current= lang;
    });
  };
  const copyRoomIdHandler = async () => {
    let textArea = document.createElement("textarea");
    textArea.value = params.roomId;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("ROOM ID has been copied");
    } catch (err) {
      // console.log(err);
      toast.error("Unable to copy ROOM ID");
    }
    document.body.removeChild(textArea);
  };
  const leaveRoomHandler = () => {
    navigator("/");
  };

  const fetchFileContent = async (url, status) => {
    try {
      const response = await axios.get(url);
      const time = status.time_used;
      const memory = status.memory_used;
      setOutput(
        `${response?.data} \n\n       Memory Used: ${memory} KB\n   Time Used: ${time} s\n`
      );
      setIserror(() => {
        return false;
      });
    } catch (err) {
      console.log(err);
    }
  };
  const getSubmission = async (url) => {
    const options = {
      method: "GET",
      url: url,
      headers: {
        ...headers,
        "Access-Control-Allow-Origin": "*",
        "client-secret": process.env.REACT_APP_CLIENT_SECRET,
      },
    };
    try {
      const res = await axios.request(options);
      const output_url = res?.data.result.run_status.output;
      if (res?.data.result.compile_status !== null) {
        // console.log(res.data.result);
        if (res.data?.result.compile_status === "OK") {
          if (res.data.result.run_status.status === "TLE") {
            setOutput("Time Limit Exceeded");
            outputHandler();
            setIserror(() => {
              return true;
            });
            return;
          }
          if (res.data.result.run_status.status === "RE") {
            if (res.data.result.run_status.stderr) {
              setOutput(res.data.result.run_status.stderr);
              outputHandler();
              setIserror(() => {
                return true;
              });
              return;
            }
            setOutput(
              `Runtime Error (${res.data.result.run_status.status_detail})`
            );
            outputHandler();
            setIserror(() => {
              return true;
            });
            return;
          }
          if (output_url !== null) {
            fetchFileContent(output_url, res.data.result.run_status);
            // setStatusobj({
            //   memory: res.data.result.run_status.memory_used,
            //   time: res.data.result.run_status.time_used,
            // });
          } else {
            getSubmission(url);
          }
        } else {
          setOutput(res.data.result.compile_status);
          outputHandler();
          setIserror(() => {
            return true;
          });
        }
        return;
      }
      if (output_url === null) {
        getSubmission(url);
      }
      // console.log(output_url);
    } catch (err) {
      console.log(err);
    }
  };

  const runCodeHandler = async () => {
    setIserror(false);
    // setStatusobj(null);
    setOutput("Compiling...");
    outputHandler();
    // console.log(inputRef.current.value);
    const data = {
      lang: selectedLanguage.id,
      source: codeRef.current,
      input: inputRef.current.value,
      memory_limit: 262144,
      time_limit: 5,
    };

    const options = {
      method: "POST",
      url: "https://api.hackerearth.com/v4/partner/code-evaluation/submissions/",
      headers: {
        ...headers,
        "client-secret": process.env.REACT_APP_CLIENT_SECRET,
      },
      data: data,
    };
    try {
      const token = await axios.request(options);
      getSubmission(token?.data?.status_update_url);
    } catch (err) {
      console.log(err);
    }
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
            {clients.map((client, idx) => {
              return <Client userName={client.userName} key={idx} />;
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
      <div className="selectWrapper">
        <div className="topBar">
          <div className="themes">
            <Select
              options={themes}
              defaultValue={themes[1]}
              onChange={(t) => {
                setTheme(t);
                inputChangeHandler(selectedLanguage);
              }}
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: "#2c333c",
                },
              })}
            />
          </div>
          <div className="select">
            <Select
              options={languages}
              value={{ id: selectedLanguage.id, label: selectedLanguage.label }}
              onChange={(lang) => {
                setSelectedLanguage(lang);
                inputChangeHandler(lang);
              }}
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: "#2c333c",
                },
              })}
              ref={selectRef}
            />
          </div>
          <div className="runBtn" onClick={runCodeHandler}>
            Run
          </div>
        </div>
        <div className="editorWrapper">
          <div className="editor">
            <Editor
              language={selectedLanguage}
              theme={theme}
              socketRef={socketRef}
              roomId={params.roomId}
              input={inputRef?.current?.value}
              onInputChange={(input) => {
                inputRef.current.value = input;
              }}
              onCodeChange={(codeInput) => {
                codeRef.current = codeInput;
              }}
            />
          </div>
          <div className="inputOutput">
            <div className="inputContainer">
              <p>StdIn</p>
              <textarea ref={inputRef} onChange={inputHandler} />
            </div>
            <div className="outputContainer">
              <p>StdOut</p>
              <textarea
                value={`${output}`}
                readOnly
                className={`${!isError ? "notError" : "error"}`}
                ref={outputRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
