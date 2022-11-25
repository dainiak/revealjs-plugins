function f(targetNode, params, revealInstance){
    let echartOptions = {
        tooltip: {},
        backgroundColor: '#fff',
        visualMap: {
            show: true,
            dimension: 2,
            min: -1,
            max: 1,
            inRange: {
                color: [
                    '#313695',
                    '#4575b4',
                    '#74add1',
                    '#abd9e9',
                    '#e0f3f8',
                    '#ffffbf',
                    '#fee090',
                    '#fdae61',
                    '#f46d43',
                    '#d73027',
                    '#a50026'
                ]
            }
        },
        xAxis3D: {
            type: 'value'
        },
        yAxis3D: {
            type: 'value'
        },
        zAxis3D: {
            type: 'value'
        },
        grid3D: {
            light: {
                main:{
                    intensity:0,
                },
                ambient:{
                    intensity: 1
                }
            },
            viewControl: {
                // projection: 'orthographic'
            }
        },
        series: [
            {
                type: 'surface',
                wireframe: {
                    show: false
                },
                equation: {
                    x: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    y: {
                        min: 0,
                        max: 1,
                        step: 0.01
                    },
                    z: function (x, y) {
                        return 0.3 + x*x + x*y*Math.sin(5*(x-y));
                    }
                }
            }
        ]
    };

    function chartLoader() {
        if(!targetNode.hasAttribute('echartInitialized')) {
            window.echarts.init(targetNode).setOption(echartOptions);
            revealInstance.layout();
            targetNode.setAttribute('echartInitialized', true);
        }
        revealInstance.off( 'ready', chartLoader );
    }

    revealInstance.on( 'ready', chartLoader );
}