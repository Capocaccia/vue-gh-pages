#!/usr/bin/env node
var fsSync = require('fs-sync');
var fs = require('fs');
var execSync = require('child_process').execSync;
var rimraf = require('rimraf');
var ghpages = require('gh-pages');
var path = require('path');
var packageJson = require('../../package.json');
var repository = packageJson['homepage'] || null;

async function pushToGhPages () {
    await ghpages.publish('docs', {
        branch: 'master',
        dest: 'docs',
        repo: repository + '.git'
    },
    function (err) {
        if (err) {
            console.log('Push to remote failed, please double check that the homepage field in your package.json links to the correct repository.')
            console.log('The build has completed but has not been pushed to github.')
        } else {
            console.log('Finished! production build is ready for gh-pages');
            console.log('Pushed to gh-pages branch')
        }
    });
}

async function copySync (file, destination) {
    await fsSync.copy(file, destination, (err) => {
        if (err) {
            console.error(err);
        }
    })
}

async function editForProduction () {
    console.log('Preparing files for github pages');

    fs.readFile('docs/index.html', 'utf-8', function (err, data) {
        var replace_href_tags = data.replace(/href=\//g, 'href=');
        var replace_src_tags = data.replace(/src=\//g, 'src=');
        fs.appendFileSync('docs/index.html', replace_src_tags, 'utf-8');
        fs.appendFileSync('docs/index.html', replace_href_tags, 'utf-8');
        if (repository !== null) {
            pushToGhPages();
        }
    });
}

function checkIfYarn () {
    return fs.existsSync(path.resolve('./' || process.cwd(), 'yarn.lock'));
}

async function runBuild () {
    console.log('Creating production build...');

    const packageManagerName = await checkIfYarn() ? 'yarn' : 'npm';

    execSync(`${packageManagerName} run build`);

    copySync('dist', 'docs');
    console.log('Build Complete.');
    const pathToBuild = 'dist';
    await rimraf(pathToBuild, async () => {
        if (fs.existsSync('CNAME')) {
            await copySync('CNAME', 'docs/CNAME');
        }
        if (fs.existsSync('404.html')) {
            await copySync('404.html', 'docs/404.html');
        }
        await editForProduction();
        if (repository !== null) {
            pushToGhPages();
        }
    });
}

async function createProductionBuild () {
    if (fs.existsSync('docs')) {
        var pathToDocs = 'docs';
        await rimraf(pathToDocs, () => {
            runBuild();
        });
    } else {
        runBuild();
    }
}

async function main () {
    await createProductionBuild();
}

main();
