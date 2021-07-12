import React, { Component } from 'react';
import { FlatList, Image } from 'react-native';
import styles from '../styles.js';
import { Container, Header, Left, Button, Icon, Right, Body, Title, Text } from 'native-base';

export class Navbar extends Component {
    constructor() {
        super();
    }

    render() {
        return (
            <Container style={styles.background}>
                <Header>
                    <Left>
                        <Button
                            transparent
                            onPress={() => this.onPressButton()}>
                            <Icon name='menu' />
                        </Button>
                    </Left>
                    <Body>
                        <Title>Home</Title>
                    </Body>
                    <Right />
                </Header>
            </Container >
        );
    }
    onPressButton = () => {
        this.props.navigator.toggleDrawer({ // the broken part
            side: 'left',
            to: 'missing'
        })
    }
}

