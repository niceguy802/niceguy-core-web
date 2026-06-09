const path = require('path')
const globby = require('globby')

class FrameworkLoader extends AppWorkerLoader {

    loadModuleController() {

        const controllerDir = path.join(
            this.options.baseDir,
            'app/modules'
        )

        const files = globby.sync([
            '**/*.controller.{js,ts}'
        ], {
            cwd: controllerDir
        })

        this.app.controller = {}

        for (const file of files) {

            const fullPath = path.join(
                controllerDir,
                file
            )

            const controller =
                require(fullPath)

            const name =
                file
                    .replace('.controller.ts', '')
                    .replace('.controller.js', '')
                    .replace(/\//g, '.')

            this.app.controller[name] =
                controller.default || controller
        }
    }

}
module.exports = FrameworkLoader