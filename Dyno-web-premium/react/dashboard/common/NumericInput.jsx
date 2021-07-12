import React, { useState, useEffect } from 'react'

export default function(props) {
    const [text, setText] = useState(props.value);
    useEffect(() => {
        if(text !== "" && text != props.value) {
            setText(props.value);
        }
    })

    return (
        <input
            type="number"
            value={text}
            onChange={(e) => {
                setText(e.target.value || "");
                const parsedNumber = Number.parseFloat(e.target.value);
                if(!Number.isNaN(parsedNumber)) {
                    props.onChange(parsedNumber);
                } 

            }}
            className={props.className}
        />
    )
}