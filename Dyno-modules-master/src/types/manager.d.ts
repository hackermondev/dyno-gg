import { CommandData } from '@dyno.gg/dyno-core';

interface AnnounceArgs extends CommandData {
	mention: string;
}