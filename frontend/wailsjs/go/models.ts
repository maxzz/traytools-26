export namespace options {
	
	export class SingleInstanceLock {
	    UniqueId: string;
	
	    static createFrom(source: any = {}) {
	        return new SingleInstanceLock(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.UniqueId = source["UniqueId"];
	    }
	}

}

