export interface Server {
    id: String;
    name?: String;
    added?: Date;
    memberCount?: Number;
    icon?: String;
    description?: String;
    longDescription?: String;
    tags?: Array<any>,
    listed?: Boolean;
    premium?: Boolean;
    featured?: Boolean;
    partner?: Boolean;
    sponsor?: Boolean;
    backgroundImage?: String;
    backgroundImageVertical?: String;
    borderColor?: String;
    weight?: Number;
}

export interface IndexedServer {
    id: String;
}

export interface IndexedServerList {
    createdAt: Date;
    validUntil: Date;
    itemCount: Number;
    weightSum: Number;
    pageCount: Number;
    pages: Array<any>;
}
