# Char (working title)

Char is a Express.js based API creation framework designed to be used by both beginners and advanced users: you can get started easily creating a basic API, while still have access to the knitty gritty details that can help you create a full featured API.

The project is still in development and in currently in early alpha. **Do not deploy this in a production server!** Any help with this project is extremely welcomed!

Char is based on Express.js, using its route definitions and middlewares, Char makes creating endpoints for publishing data easy while automatically making those data available through an API. Char is meant to be a website or app's back end, although you can serve a static website through it, it is not recommended to render the front end with Char. Any front end that goes with Char should consume its API (including when serving static websites through Char).

##### What Char is NOT:
- A full-stack framework
- A highly opinionated framework
- Trying to invent new concepts

##### What Char is:
- A quick and easy way to setup data structures that will be available through an API
- An Express server (if you know Express, you know Char)

## Features
Char by default exposes an API under the `/api/` route and whatever is under the `public` directory under the `/` route (where you should put your static site if you wish to serve it with Char).

Char uses an implmentation of [active record](https://github.com/limzykenneth/absurd-raven) that I wrote from scratch, currently only works with MongoDB but there are plans for other databases once the API is stable.

There is a separate control panel front end built side by side with Char but it is maintained separately. Char will only be concerned with the REST API endpoints and back end logic, the control panel simply consumes the API exposed. The control panel provides utilities for easy creation of HTML fields including text, radio boxes, checkboxes, file/image upload, etc. This will be made available when the project goes into beta (when? I don't know).

Char uses a MVC-like structure inspired by backbone.js. Each piece of data (document in MongoDB, model in backbone.js) is a model, a set of models are grouped under a collection and a collection are defined by its schema which the models adhere to. There is no view layer.

## Usage
Setup a MongoDB database and include your database credentials and information as follows into a `.env` file at the root of the project:
```
# Change this to `production` when deploying
NODE_ENV=development

# MongoDB connection information
mongo_server=PATH_TO_SERVER # (eg. localhost:27017)
mongo_db_name=DATABASE_NAME
mongo_user=USERNAME
mongo_pass=PASSWORD

JWT_SECRET=SECRET_KEY
```

Run `npm start` to start the production server, `npm run server` to run the development servers that automatically restarts the server on file change. See `gulpfile.js` for more elaborated uses of the build steps.

More documentation to follow when I reached beta.

## Develop
All contributions, ideas, advice, pull request are all highly valued.

I made this because I couldn't find something that met my needs, namely a framework to fulfill all of the following:
- Arbitrarily define a model's schema without any preconception of what an entry's structure should be
- A friendly but flexible and powerful back end user interface
- An API server
- A user based back end management system
- A framework that doesn't expect me to render my front end on the back end

I used to (still do actually) use Wordpress API to create back ends for my clients' website so that they can have a relatively easy to use interface for curating data while I have full control over how I want to build the front end website. The problem is Wordpress is, at its core, a blogging platform, everything in Wordpress is thought of as a kind of blog post. To create an appropriate back end for my clients, I have to bring in multiple plugins, hack away on `functions.php` and worst case hack on dodgy unmaintained plugins. I had enough but I couldn't find something as well formed as Wordpress in terms of developer's hands-off usage and is API focused. So I decided to build one myself.

If you think this is something that resonates with you and you want to help out with the project, just let me know! I have particular need for someone more familiar with back end developments as I'm really [**just**](https://media.giphy.com/media/3ELtfmA4Apkju/giphy.gif) a front end developer.

### Just a list for myself, nothing else underneath
#### Upload mechanism

The user first send a request for upload either through the model creation route (`POST /api/:collectionSlug`) or through the file upload route (`POST /api/upload`).

Requesting an upload begins by sending relevant metadata of the resource:
* File type
* File size
* File name
* Owner (?)
* File description (to bee used for aria)

Next, the server evaluates the metadata: if file type is not acceptable, reject; if file size is too big, reject, etc. Once checks passed, create an entry in the `_file_upload` table with the metadata fields plus two extra fields, one with timestamp of when the upload link will expire (`expire`), the other with a unique, one-time upload ID that defined the upload path for the resource. A response is then sent to the client with the route that they should upload the resource to and the expiry time of the upload path.

Once the client receives the response, they check the expiry time to make sure it hasn't expired yet, if it has start from sending the metadata again. Then the client initiates raw file upload with the appropriate `Content-Type` header.

When the server received the upload:
1. Check the `Content-Length` header matches what was given in the metadata, if not, abort and return error.
2. Check the `Content-Type` header matches what was given in the metadata, if not, abort and return error.
3. As upload stream in, keep check of how much bytes were uploaded, if it exceeds what was given in the metadata, abort and return error.
4. Once upload finished with no errors, save file locally or to a CDN (or stream the file as it comes in, delete what was saved if error occurred).
5. Generate or retrieve the permanent URL for the resource, update it in the model if relevant, then respond to the client with a body containing the model (as currently designed and with resource permanent URL) or with the resource's permanent URL.

#### `_file_upload` metadata fields

```javascript
{
	"file_size": 1024,
	"content-type": "audio/ogg",
	"file_name": "sound.ogg",
	"file_description": "Sound of silence"
}
```