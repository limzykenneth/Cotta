// Use mongodb as a file store
// Implementation pending
// https://medium.com/@dineshuthakota/how-to-save-file-in-mongodb-using-node-js-1a9d09b019c1
// https://mongodb.github.io/node-mongodb-native/3.2/api/GridFSBucket.html

class MongoDBStorage{
	constructor(config){

	}

	async length(id){

	}

	getStream(id){

	}

	// `id`` is the file path and `file` is a stream
	// Returns promise of saved file's size
	set(id, file){

	}

	del(id){

	}

	ping(){

	}
}

module.export = MongoDBStorage;