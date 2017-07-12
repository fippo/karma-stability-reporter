/* based on this excellent tutorial:
 * https://www.ironsrc.com/news/how-to-create-a-custom-karma-reporter-3/
 */
const fs = require('fs');
function StabilityReporter(baseReporterDecorator, config, logger) {
    baseReporterDecorator(this);
    let log = logger.create('reporter.stability');
    let tests = [];
    this.specSuccess = function(browser, result) {
        tests.push(['PASS', result.suite.join(' '),
            result.description].join(' '));
    };
    this.specSkipped = function(browser, result) {
        tests.push(['SKIP', result.suite.join(' '),
            result.description].join(' '));
    };
    this.specFailure = function(browser, result) {
        tests.push(['ERR', result.suite.join(' '),
            result.description,
            result.assertionErrors[0] ?
                result.assertionErrors[0].name : 'timeout'
        ].join(' '));
    };
    this.onRunComplete = function(browserCollection, results) {
        if (results.error || results.disconnected) {
            return;
        }
        const expected = fs.readFileSync(config.stabilityReporter.path,
            {encoding: 'ascii'});
        // Set the exit code so that only unexpected failures result in
        // a non-zero exit code.
        results.exitCode = expected.trim() === tests.join('\n') ? 0 : 1;
        log.info('DONE', process.env.BROWSER, process.env.BVER,
            'success=' + results.success,
            'failed=' + results.failed,
            'expected=' + (results.exitCode === 0));

        // When a test fails show the results of the test.
        // TODO: make a nicer diff.
        if (results.exitCode !== 0 && config.stabilityReporter.update) {
            log.info('Updating expectations', config.stabilityReporter.path);
            fs.writeFileSync(config.stabilityReporter.path,
                tests.join('\n').trim() + '\n', {encoding: 'ascii'});
        }
    };
};

StabilityReporter.$inject = ['baseReporterDecorator', 'config', 'logger'];

module.exports = {
    'reporter:stability': ['type', StabilityReporter]
};
