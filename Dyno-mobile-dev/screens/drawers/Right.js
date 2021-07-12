import React, { Component } from 'react';
import { Container, Text } from 'native-base';
import styles from '../../styles';

export class RightDrawer extends Component {
    render() {
        return (
            <Container style={styles.drawer}>
                <Text> textInComponent </Text>
            </Container>
        );
    }
}
