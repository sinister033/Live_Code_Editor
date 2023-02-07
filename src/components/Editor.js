import React, { useEffect, useRef } from "react";
import Codemirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/clike/clike";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/ayu-mirage.css";
import "codemirror/theme/nord.css";
import "codemirror/addon/edit/closebrackets";
import "codemirror/addon/edit/closetag";
import ACTIONS from "../Actions";

const Editor = (props) => {
  const textEditorRef = useRef(null);
  useEffect(() => {
    async function init() {
      textEditorRef.current = Codemirror.fromTextArea(
        document.getElementById("codeArea"),
        {
          mode: { name: "text/x-c++src" },
          theme: "ayu-mirage",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          autoRefresh: true,
          // extraKeys: {
          //   // Tab: "indentAuto",
          // },
        }
      );
      textEditorRef.current.on("change", (instance, changes) => {
        // console.log(changes);
        const { origin } = changes;
        const codeInput = instance.getValue();
        props.onCodeChange(codeInput);
        // console.log(codeInput);
        if (origin !== "setValue") {
          props.socketRef.current.emit(ACTIONS.CODE_CHANGE, {
            roomId: props.roomId,
            codeInput,
          });
        }
      });
    }
    init();
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (props.socketRef.current) {
      props.socketRef.current.on(ACTIONS.CODE_CHANGE, ({ codeInput }) => {
        if (codeInput !== null) {
          textEditorRef.current.setValue(codeInput);
        }
      });
    }
    return () => {
      props.socketRef.current.off(ACTIONS.CODE_CHANGE);
    };
  }, [props.socketRef.current]);

  return <textarea id="codeArea"></textarea>;
};

export default Editor;
