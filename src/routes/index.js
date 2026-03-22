import apiV1 from './v1/index.js'


const routes = (app) => {
    app.use('/api/v1', apiV1)
}

export default routes;