import React from 'react';

export default class Slowmode extends React.Component {
	render() {
		return (
			<iframe
				width='100%'
				height='100%'
				frameborder='0'
				src='https://www.youtube.com/embed/dQw4w9WgXcQ?controls=0&autoplay=1&loop=1'
				allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture'
				allowfullscreen></iframe>
		);
	}
}