import React, { useState, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Circle, Image, Group, Transformer } from 'react-konva';
import NumericInput from 'react-numeric-input';
import RichCheckbox from '../common/RichCheckbox.jsx';

const height = 400;
const width = 700;

export default function WelcomeImageBuilder(props) {
    const avatarRef = useRef(null);
    const transformerRef = useRef(null);
    const stageRef = useRef(null);
    const nameRef = useRef(null);
    const welcomeRef = useRef(null);

    const avatarImg = document.images.namedItem('avatar-img');
    const [circleAvatar, setCircleAvatar] = useState(true);
    const [selectedShape, setSelectedShape] = useState(null);
    const [avatarAttr, setAvatarAttr] = useState({
        id: "avatar",
        x: 286,
        y: 100,
        width: 128,
        height: 128,
        scale: { x: 1, y: 1 },
        rotation: 0,
        image: avatarImg,
        fillPatternImage: avatarImg,
        fillPatternRepeat: 'no-repeat',
        ...props.image.avatar,
        onClick: _ => setSelectedShape('avatar'),
    });

    const [nameAttr, setNameAttr] = useState({
        id: "name",
        x: 0,
        y: 250,
        width: 700,
        height: 30,
        scale: { x: 1, y: 1 },
        rotation: 0,
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'white',
        align: 'center',
        text: `${user.username}#${user.discriminator}`,
        ...props.image.userText,
        onClick: _ => setSelectedShape('name'),
    });

    const [welcomeTextAttr, setWelcomeTextAttr] = useState({
        id: "welcome",
        x: 286,
        y: 300,
        width: 160,
        height: 30,
        scale: { x: 1, y: 1 },
        rotation: 0,
        fontSize: 30,
        fontFamily: 'Calibri',
        fill: 'white',
        text: `Welcome`,
        ...props.image.welcomeText,
        onClick: _ => setSelectedShape('welcome'),
    });

    const [advancedSettings, setAdvancedSettings] = useState({ welcome: false, avatar: false, name: false })

    const toggleAdvancedSetting = (name) => {
        const obj = {};
        obj[name] = !advancedSettings[name];
        setAdvancedSettings({
            ...advancedSettings,
            ...obj,
        });
    }

    const getOffsets = (state) => {
        return {
            offsetX: -state.width / 2,
            offsetY: -state.height / 2,
            fillPatternX: -state.width / 2,
            fillPatternY: -state.height / 2,
        }
    }
    
    const onChangeHelper = (obj, setter, oldState) => {
        setter({
            ...oldState,
            ...obj,
        });
    }
    
    const onChangeAvatarHandler = (name, value) => {
        const obj = {};
        obj[name] = value;
        onChangeHelper(obj, setAvatarAttr, avatarAttr);
    }
    
    const onChangeNameHandler = (name, value) => {
        const obj = {};
        obj[name] = value;
        onChangeHelper(obj, setNameAttr, nameAttr);
    }
    
    const onChangeWelcomeHandler = (name, value) => {
        const obj = {};
        obj[name] = value;
        onChangeHelper(obj, setWelcomeTextAttr, welcomeTextAttr);
    }
    const transformEndHandler = (reference, setter, oldState) => {
        const ref = reference.current;
        const newSize = {
            rotation: ref.rotation(),
            scale: ref.scale()
        };
    
        if(selectedShape !== 'avatar') {
            newSize.width = Math.round(ref.width() * ref.scaleX());
            newSize.height = Math.round(ref.height() * ref.scaleY());
            newSize.scale = { x: 1, y: 1};
            ref.scale({x: 1, y: 1});
        }
    
        setter({
            ...oldState,
            ...newSize,
        });
    }
    
    const dragEndHander = (e, setter, oldState) => {
        const newCoords = {
            x: Math.round(e.target.x()),
            y: Math.round(e.target.y()),
        }
    
        setter({
            ...oldState,
            ...newCoords,
        });
    }

    const save = () => {
        const image = {};
        image.avatar = { circleAvatar,...avatarAttr };
        delete image.avatar.onClick;
        delete image.avatar.image;
        delete image.avatar.fillPatternImage;

        image.welcomeText = { ...welcomeTextAttr };
        delete image.welcomeText.onClick;
        
        image.userText = { ...nameAttr };
        delete image.userText.onClick;

        props.save(image);
    }

    useEffect(() => {
        if (selectedShape === 'avatar') {
            transformerRef.current.attachTo(avatarRef.current);
        }
        if (selectedShape === 'name') {
            transformerRef.current.attachTo(nameRef.current);
        }
        if (selectedShape === 'welcome') {
            transformerRef.current.attachTo(welcomeRef.current);
        }
        stageRef.current.draw();


        return () => {
            transformerRef.current.detach();
            stageRef.current.draw();
        }
    }, [selectedShape, circleAvatar]);

    const showIcon = (
        <span className='icon is-link'>
            <i className='fa fa-plus-circle'></i>
        </span>
    );

    const hideIcon = (
        <span className='icon is-link'>
            <i className='fa fa-minus-circle'></i>
        </span>
    );

    return (
        <React.Fragment>
            <div className='settings-content'>
                <h3 class="title is-4">Preview</h3>
                <Stage
                    width={width}
                    height={height}
                    ref={stageRef}
                    onMouseDown={e => {
                        if (e.target === e.target.getStage()) {
                            setSelectedShape(null);
                        }
                    }}
                >
                    <Layer>
                        {circleAvatar &&
                            <Circle
                                {...avatarAttr}
                                {...getOffsets(avatarAttr)}
                                ref={avatarRef}
                                draggable
                                onDragEnd={e => { dragEndHander(e, setAvatarAttr, avatarAttr) }}
                                onTransformEnd={_ => { transformEndHandler(avatarRef, setAvatarAttr, avatarAttr) }}
                            />
                        }
                        {!circleAvatar &&
                            <Image
                                {...avatarAttr}
                                ref={avatarRef}
                                draggable
                                onDragEnd={e => { dragEndHander(e, setAvatarAttr, avatarAttr) }}
                                onTransformEnd={_ => { transformEndHandler(avatarRef, setAvatarAttr, avatarAttr) }}
                            />
                        }
                        <Text
                            ref={nameRef}
                            {...nameAttr}
                            draggable
                            onDragEnd={e => { dragEndHander(e, setNameAttr, nameAttr) }}
                            onTransformEnd={_ => { transformEndHandler(nameRef, setNameAttr, nameAttr) }}
                        />
                        <Text
                            ref={welcomeRef}
                            {...welcomeTextAttr}
                            draggable
                            onDragEnd={e => { dragEndHander(e, setWelcomeTextAttr, welcomeTextAttr) }}
                            onTransformEnd={_ => { transformEndHandler(welcomeRef, setWelcomeTextAttr, welcomeTextAttr) }}
                        />
                        <Transformer
                            anchorStroke={'#0CE9D3'}
                            anchorFill={'#0CE9D3'}
                            borderStroke={'#FFFFFF'}
                            ref={transformerRef}
                        />
                    </Layer>
                </Stage>
                <a className="button is-info" onClick={save}>Save</a>
            </div>
            <div className="settings-content welcome-element-options">
                <h3 class="title is-4">Avatar Options</h3>
                <div className="options-container">
                    <div class="control">
                        <RichCheckbox
                            text='Round Avatar'
                            isBlock={false}
                            onChange={(e) => setCircleAvatar(!circleAvatar)}
                            defaultValue={circleAvatar}
                        />
                    </div>
                </div>
                <fieldset className='control-group-toggle' onClick={() => toggleAdvancedSetting('avatar')}>
                    <legend>
                        {advancedSettings.avatar ? hideIcon : showIcon} Advanced Settings
                    </legend>
                </fieldset>
                { advancedSettings.avatar && 
                    <div className="options-container advanced">
                        <div class="control">
                            <label className='label'>X</label>
                            <NumericInput style={false} value={avatarAttr.x} onChange={(value) => { onChangeAvatarHandler('x', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Y</label>
                            <NumericInput style={false} value={avatarAttr.y} onChange={(value) => { onChangeAvatarHandler('y', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Width</label>
                            <NumericInput style={false} value={avatarAttr.width} onChange={(value) => { onChangeAvatarHandler('width', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Height</label>
                            <NumericInput style={false} value={avatarAttr.height} onChange={(value) => { onChangeAvatarHandler('height', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Rotation</label>
                            <NumericInput style={false} value={avatarAttr.rotation} onChange={(value) => { onChangeAvatarHandler('rotation', value) }} />
                        </div>
                    </div>
                }
            </div>
            <div className="settings-content welcome-element-options">
             <h3 class="title is-4">User Text Options</h3>
                <div className="options-container">
                    <div class="control">
                        <label className='label'>Font Size</label>
                        <NumericInput style={false} value={nameAttr.fontSize} onChange={(value) => { onChangeNameHandler('fontSize', value) }} />
                    </div>
                    <div class="control">
                        <RichCheckbox
                            text='Center text'
                            isBlock={false}
                            onChange={(_, checked) => onChangeNameHandler('align', (checked) ? 'center' : 'left')}
                            defaultValue={nameAttr.align === 'center'}
                        />
                    </div>
                </div>
                <fieldset className='control-group-toggle' onClick={() => toggleAdvancedSetting('name')}>
                    <legend>
                        {advancedSettings.name ? hideIcon : showIcon} Advanced Settings
                    </legend>
                </fieldset>
                { advancedSettings.name && 
                    <div className="options-container advanced">
                        <div class="control">
                            <label className='label'>X</label>
                            <NumericInput style={false} value={nameAttr.x} onChange={(value) => { onChangeNameHandler('x', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Y</label>
                            <NumericInput style={false} value={nameAttr.y} onChange={(value) => { onChangeNameHandler('y', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Width</label>
                            <NumericInput style={false} value={nameAttr.width} onChange={(value) => { onChangeNameHandler('width', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Height</label>
                            <NumericInput style={false} value={nameAttr.height} onChange={(value) => { onChangeNameHandler('height', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Rotation</label>
                            <NumericInput style={false} value={nameAttr.rotation} onChange={(value) => { onChangeNameHandler('rotation', value) }} />
                        </div>
                    </div>
                }
            </div>
            <div className="settings-content welcome-element-options">
                <h3 class="title is-4">Welcome Text Options</h3>
                <div className="options-container">
                    <div class="control">
                        <label className='label'>Font Size</label>
                        <NumericInput style={false} value={welcomeTextAttr.fontSize} onChange={(value) => { onChangeWelcomeHandler('fontSize', value) }} />
                    </div>
                    <div class="control">
                        <RichCheckbox
                            text='Center text'
                            isBlock={false}
                            onChange={(_, checked) => onChangeWelcomeHandler('align', (checked) ? 'center' : 'left')}
                            defaultValue={welcomeTextAttr.align === 'center'}
                        />
                    </div>
                    <div class="control has-textarea">
                        <label className='label'>Text</label>
                        <textarea type="text" value={welcomeTextAttr.text} onChange={(e) => { onChangeWelcomeHandler('text', e.target.value) }} />
                    </div>
                </div>
                <fieldset className='control-group-toggle' onClick={() => toggleAdvancedSetting('welcome')}>
                    <legend>
                        {advancedSettings.welcome ? hideIcon : showIcon} Advanced Settings
                    </legend>
                </fieldset>
                { advancedSettings.welcome && 
                    <div className="options-container advanced">
                        <div class="control">
                            <label className='label'>X</label>
                            <NumericInput style={false} value={welcomeTextAttr.x} onChange={(value) => { onChangeWelcomeHandler('x', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Y</label>
                            <NumericInput style={false} value={welcomeTextAttr.y} onChange={(value) => { onChangeWelcomeHandler('y', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Width</label>
                            <NumericInput style={false} value={welcomeTextAttr.width} onChange={(value) => { onChangeWelcomeHandler('width', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Height</label>
                            <NumericInput style={false} value={welcomeTextAttr.height} onChange={(value) => { onChangeWelcomeHandler('height', value) }} />
                        </div>
                        <div class="control">
                            <label className='label'>Rotation</label>
                            <NumericInput style={false} value={welcomeTextAttr.rotation} onChange={(value) => { onChangeWelcomeHandler('rotation', value) }} />
                        </div>
                    </div>
                }  
            </div>
        </React.Fragment >
    );
}