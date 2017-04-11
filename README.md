# Char (working title)

Char is a Express.js based API creation framework designed to be used by both beginners and advanced users: you can get started easily creating a basic API, while still have access to the knitty gritty details that can help you create a full featured API.

The project is still in development and not considered to be in alpha yet. **Do not deploy this in a production server!** Any help with this project is extremely welcomed!

Char is based on Express.js, using its route definitions and middlewares, Char makes creating forms for publishing data easy while automatically making those data available through an API. Char is meant to be a website or app's back end, although you can serve a static website through it, it is not recommended to render the front end with Char. Any front end that goes with Char should consume its API (including when serving static websites through Char).

##### What Char is NOT:
- A full-stack framework
- A highly opinionated framework
- Trying to invent new concepts

##### What Char is:
- A quick an easy way to setup data structures that will be available through an API
- An Express server (if you know Express, you know Char)

## Features
Char by default exposes an API under the `/api/` route, a control panel under the `/admin/` route and whatever is under the `public` directory under the `/` route (where you should put your static site if you with to serve it with Char).

The default database is MongoDB. *Future plans are to make Char relatively database agnostic.* Char does render a front end but it is meant to be the control panel only and not supposed to be public facing. The default rendering engine is Handlebars.

The control panel provides utilities for easy creation of HTML fields including text, radio boxes, checkboxes, file/image upload, etc.

Char is highly configurable, you can swap out parts of the package and use your own.
- Swap Less.js for Sass
- Swap Handlebars for Pug
- Swap WYSIWYG for Markdown

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
```

Run `npm start` to start the production server, `npm run dev-server` to run the development servers for both front and back end. See `gulpfile.js` for more elaborated uses of the build steps.

Visit `http://localhost:8080/admin` and you will find the entry point to the back end control panel.

More documentation to follow when I completed phase 1.

## Develop
All contributions, ideas, advice, pull request are all highly valued.

I made this because I couldn't find something that met my needs, namely a framework to fulfill all of the following:
- Arbitrarily define a model's schema without any preconception of what an entry's structure should be
- A friendly but flexible and powerful back end user interface
- An API server
- A user based back end management system
- A framework that doesn't expect me to render my front end on the back end

I used to (still do actually) use Wordpress API to create back ends for my clients' website so that they can have a relatively easy to use interface for curating data while I have full control over how I want to build the front end website. The problem is Wordpress is, at its core, a blogging platform, everything in Wordpress is thought of as a kind of blog post. To create an appropriate back end for my clients, I have to bring in multiple plugins, hack away on `functions.php` and worst case hack on dodgy unmaintained plugins. I had enough but I couldn't find something as well formed as Wordpress in terms of developer hands-off usage and is API focused. So I decided to build one myself.

If you think this is something that resonates with you and you want to help out with the project, just let me know! I have particular need for someone more familiar with back end developments as I'm really [**just**](https://media.giphy.com/media/3ELtfmA4Apkju/giphy.gif) a front end developer.

### Just a list for myself, nothing else underneath
Routes for control panel:

| Method | Route                                     | Description
| ------ | ----------------------------------------- | -----------------------------------------
| GET    | `/admin`                                  | Home page
| GET    | `/admin/login`                            | Login page
| POST   | `/admin/login`                            | Login
| GET    | `/admin/logout`                           | Logout
| GET    | `/admin/signup`                           | Signup page
| POST   | `/admin/signup`                           | Signup
| GET    | `/admin/collections`                      | List all collections (schema)
| GET    | `/admin/collections/new`                  | Create new collection form
| GET    | `/admin/collections/edit/mycollection`    | Edit `mycollection` form
| POST   | `/admin/schema/new`                       | Create new collection (new schema)
| POST   | `/admin/schema/edit/mycollection`         | Edit `mycollection` (edit schema)
| GET    | `/admin/collections/mycollection`         | List all models of `mycollection`
| GET    | `/admin/collections/mycollection/new`     | Create new model of `mycollection` form
| POST   | `/admin/collections/mycollection/new`     | Create new model of `mycollection`
| GET    | `/admin/collections/mycollection/24`      | Show data of model with unique ID 24 from `mycollection`
| GET    | `/admin/collections/mycollection/24/edit` | Render form to edit data of model with unique ID 24 from `mycollection`
| POST   | `/admin/collections/mycollection/24/edit` | Edit data of model with unique ID 24 from `mycollection`
| GET    | `/admin/config`                           | Render form to edit site configurations
| POST   | `/admin/config`                           | Edit site configurations
| GET    | `/admin/users`                            | (Admin only) List all users and roles
| GET    | `/admin/users/2`                          | (Admin only) Show data of user with unique ID 2
| POST   | `/admin/users/2`                          | (Admin only) Edit data of user with unique ID 2
| GET    | `/admin/account`                          | (User self only) Show data of user who made the request
| POST   | `/admin/account`                          | (User self only) Edit data of user who made the request
