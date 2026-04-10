export namespace main {
	
	export class ClipItem {
	    id: string;
	    type: string;
	    content: string;
	    preview: string;
	    details: string;
	    pinned: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ClipItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.content = source["content"];
	        this.preview = source["preview"];
	        this.details = source["details"];
	        this.pinned = source["pinned"];
	    }
	}

}

