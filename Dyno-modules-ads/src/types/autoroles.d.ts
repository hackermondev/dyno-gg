import * as eris from 'eris';

interface Autorole {
    guild: string;
    user: string;
    role: string;
    type: string;
    duration: number,
    createdAt: number,
}

interface AutoroleSetting {
    role: string;
    type: string;
    wait: number;
}

interface RankObject {
    id: string;
    name: string;
    memberCount: number;
}