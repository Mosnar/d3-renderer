var fs = require('fs');
var Routes = require('./Routes.js');
var webpage = require('webpage');

function renderElementToPdf(page, selector) {
    if (!fs.exists('tmp')) {
        fs.makeDirectory('tmp');
    }
    var filename = 'tmp/' + (new Date().getTime().toString()) + '.pdf';

	var prevClipRect = page.clipRect;
	page.clipRect = page.evaluate(function(selector) {
		return document.querySelector(selector).getBoundingClientRect();
	}, selector);
    page.render(filename, {format: 'pdf'});
	page.clipRect = prevClipRect;

    var pdf = btoa(fs.open(filename, 'rb').read());
    fs.remove(filename);

	return pdf;
}

function renderElementToPng(page, selector) {
	var prevClipRect = page.clipRect;
	page.clipRect = page.evaluate(function(selector) {
		return document.querySelector(selector).getBoundingClientRect();
	}, selector);
    png = page.renderBase64('png');
	page.clipRect = prevClipRect;

	return png;
}


var app = new Routes();

app.post('/d3/svg', function(req, res) {
    data = JSON.parse(req.post);

    if (data.scripts && data.main && data.params) {
        page = webpage.create();
        page.viewportSize = {width: 1000, height: 1000};
        page.setContent('<html><head><meta charset="utf-8"></head><body></body></html>', 'http://www.nohost.org');
        page.injectJs('d3.min.js');

        var scripts = '';
        for (var i = 0; i < data.scripts.length; i++) {
            scripts += '\n' + data.scripts[i];
        }
        var params = 'var params=JSON.parse(\'' + JSON.stringify(data.params) + '\');';
        var main = data.main + '(params)(d3.select("body").node());';
        page.evaluateJavaScript('function(){' + scripts + params + main + '}');

        var svg = page.evaluate(function() {return (new XMLSerializer()).serializeToString(document.querySelector('svg'));});
        res.header('Content-Type', 'image/svg+xml; charset=utf-8');
        res.send(svg);
    } else {
        res.statusCode = 400;
        res.send(
            "Missing parameters. Make sure to send a valid JSON request."
        );
    }
});

app.post('/d3/pdf', function(req, res) {
    data = JSON.parse(req.post);

    if (data.scripts && data.main && data.params) {
        page = webpage.create();

        // we need to set the height to a minimum, it gets automatically
        // set to the actual render size!
        width = data.params.viewport_width || 1000;
        page.viewportSize = {width: width, height: 1};

        page.setContent(
            '<html><head></head><body><div id="viewport"></div></body></html>',
            'http://www.nohost.org'
        );
        page.injectJs('d3.min.js');

        var scripts = '';
        for (var i = 0; i < data.scripts.length; i++) {
            scripts += '\n' + data.scripts[i];
        }
        var params = 'var params=JSON.parse(\'' + JSON.stringify(data.params) + '\');';
        var main = data.main + '(params)(d3.select("#viewport").node());';
        page.evaluateJavaScript('function(){' + scripts + params + main + '}');

        var pdf = renderElementToPdf(page, '#viewport');

        res.header('Content-Type', 'application/base64');
        res.header('Content-Length', pdf.length.toString());
        res.send(pdf);
    } else {
        res.statusCode = 400;
        res.send(
            "Missing parameters. Make sure to send a valid JSON request."
        );
    }
});

app.post('/d3/png', function(req, res) {
    data = JSON.parse(req.post);

    if (data.scripts && data.main && data.params) {
        page = webpage.create();

        // It seems that only the width of the viewport is relevant. The height
        // seems to get extended or cropped to the rendered element.
        width = data.params.viewport_width || 1000;
        page.viewportSize = {width: width, height: width};

        page.setContent(
            '<html><head></head><body><div id="viewport"></div></body></html>',
            'http://www.nohost.org'
        );
        page.injectJs('d3.min.js');

        var scripts = '';
        for (var i = 0; i < data.scripts.length; i++) {
            scripts += '\n' + data.scripts[i];
        }
        var params = 'var params=JSON.parse(\'' + JSON.stringify(data.params) + '\');';
        var main = data.main + '(params)(d3.select("#viewport").node());';
        page.evaluateJavaScript('function(){' + scripts + params + main + '}');

        var png = renderElementToPng(page, '#viewport');

        res.header('Content-Type', 'application/base64');
        res.header('Content-Length', png.length.toString());
        res.send(png);
    } else {
        res.statusCode = 400;
        res.send(
            "Missing parameters. Make sure to send a valid JSON request."
        );
    }
});

app.listen(1337);

console.log('Listening on port 1337.');
