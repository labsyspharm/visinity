class Scatterplot {
    clusters;

    constructor(id, canvasId, eventHandler, dataLayer, neighborhoodTable, colorScheme, small = false, image = false, dataset = '') {
        this.id = id;
        this.canvasId = canvasId;
        this.dataset = dataset;
        this.eventHandler = eventHandler;
        this.dataLayer = dataLayer;
        this.colorScheme = colorScheme;
        this.neighborhoodTable = neighborhoodTable;
        this.lastLasso = null;
        this.small = small;
        this.image = image;
    }

    init() {
        const self = this;
        window.devicePixelRatio = 1;
        const canvas = document.querySelector(`#${self.canvasId}`);
        let {width, height} = canvas.getBoundingClientRect();
        let ratio = window.devicePixelRatio;
        width = width / ratio;
        height = height / ratio;
        self.lassoActive = false;
        self.editMode = false;
        self.customClusterDiv = document.getElementById('custom_cluster');
        self.saveLassoButton = document.getElementById('save_lasso');
        self.plot = null;
        self.colorMap = _.map(_.range(_.size(self.colorScheme.colorMap) / 2), i => {
            return hexToRGBA(self.colorScheme.colorMap[_.toString(i)].hex, 0.1)
        });
        self.orangeMap = _.map(_.range(_.size(self.colorScheme.colorMap) / 2), i => {
            return hexToRGBA('#ffa500', 0.1)
        });
        self.greyMap = _.map(_.range(_.size(self.colorScheme.colorMap) / 2), i => {
            return hexToRGBA('#fffff', 0.01)
        });

        if (self.image) {
            self.plot = createScatterplot({
                canvas,
                // width,
                // height,
                pointColor: self.greyMap,
                pointColorActive: self.orangeMap,
                pointColorHover: self.orangeMap,
                opacityBy: 'density',
                colorBy: 'valueB',
                // opacityBy: 'density',
                // opacityBy: 'density',
                // pointColorActive: hexToRGBA('#ffa500', 0.2),
                // backgroundColor: [0, 0, 0, 0],
                pointSize: 1,
                lassoColor: hexToRGBA('#ffa500', 0.2),
                pointOutlineWidth: 0,
                pointSizeSelected: 1
            });
        } else {
            self.plot = createScatterplot({
                canvas,
                // width,
                // height,
                pointColor: self.greyMap,
                pointColorActive: self.orangeMap,
                pointColorHover: self.orangeMap,
                colorBy: 'valueB',
                // pointColorActive: hexToRGBA('#ffa500', 0.2),
                backgroundColor: [0, 0, 0, 0],
                pointSize: 1,
                lassoColor: hexToRGBA('#ffa500', 0.2),
                pointOutlineWidth: 0,
                pointSizeSelected: 0
            });
        }
        // if (self.image) {
        //
        //
        //     if (mode === 'single') {
        //         self.plot.set({
        //             lassoColor: hexToRGBA('#000000', 0.0)
        //         })
        //     }
        // }


        self.plot.subscribe('select', self.select.bind(self));
        self.plot.subscribe('lassoStart', self.lassoStart.bind(self));
        self.plot.subscribe('lassoEnd', self.lassoEnd.bind(self));

        let editButton = document.getElementById('edit_clustering');
        if (editButton) {
            editButton.addEventListener('click', self.switchEditMode.bind(self));
        }

        // Custom Cluster Submit
        let button = document.getElementById("custom_cluster_submit");
        if (button) {
            button.addEventListener('click', self.customCluster.bind(self));
        }

        if (self.saveLassoButton) {
            self.saveLassoButton.addEventListener('click', self.saveLasso.bind(self));
        }
    }

    saveLasso() {
        const self = this;
        if (self.lastLasso) {
            return dataLayer.saveLasso(self.lastLasso)
                .then((rows) => {
                    neighborhoodTable.drawRows(rows);
                })
        }
    }


    async wrangle(data) {
        const self = this;
        if (data) {
            self.visData = data;
        } else {
            self.visData = await dataLayer.getScatterplotData();
            self.visData = self.visData.data;
        }
        // if (colorByCellType) {
        //     let colorMap = _.map(_.range(_.size(self.colorScheme.colorMap) / 2), i => {
        //         return hexToRGBA(self.colorScheme.colorMap[_.toString(i)].hex, 0.08)
        //     });
        //     let activeColorMap = _.map(_.range(_.size(colorMap)), i => {
        //         return hexToRGBA('#ffa500', 1);
        //     })
        //
        //     self.plot.set({
        //         pointColor: colorMap,
        //         pointColorActive: activeColorMap,
        //         pointColorHover: activeColorMap,
        //         colorBy: 'valueB',
        //     });
        //
        // } else {
        //     self.plot.set({
        //         pointColor: hexToRGBA('#b2b2b2', 0.08),
        //         pointColorActive: hexToRGBA('#ffa500', 0.2),
        //     });
        // }
        if (!self.image) {
            self.plot.draw(self.visData);
        } else {
            self.plot.draw(self.visData);
        }
        if (self.image || mode === 'multi') {
            if (searching) {
                self.imageSelection = await self.dataLayer.getImageSearchResults(self.dataset);
                self.recolor(self.imageSelection[self.dataset].cells);
                self.addImageResultInfo(self.imageSelection[self.dataset]['num_results'], self.imageSelection[self.dataset]['p_value'])
            }
            searching = false;
        }
    }

    addImageResultInfo(numResults, pValue) {
        const self = this;
        d3.select(`#${self.id}`).selectAll('.image_result_info').remove()
        let absoluteContainer = d3.select(`#${self.id}`).append('div')
            .classed('image_result_info', true)
        let row1 = absoluteContainer.append('div').classed('row', true)
        let row1col1 = row1.append('div')
            .classed('col-6', true)
        row1col1.append('span')
            .classed('image_result_info', true)
            .text('Results')
        let row1col2 = row1.append('div')
            .classed('col-6', true)
        row1col2.append('span')
            .classed('image_result_value', true)
            .text(numResults)

        let row2 = absoluteContainer.append('div').classed('row', true)
        let row2col1 = row2.append('div')
            .classed('col-6', true)
        row2col1.append('span')
            .classed('image_result_info', true)
            .text('P Value')
        let row2col2 = row2.append('div')
            .classed('col-6', true)
        row2col2.append('span')
            .classed('image_result_value', true)
            .text(Number((pValue).toFixed(1)))


    }

    recolor(selection = null) {
        const self = this;
        console.log('recoloring', self.id)
        if (!selection) {
            selection = _.map(this.dataLayer.getCurrentRawSelection().cells, e => e.id)
            console.log('Finding Selection Because Not Specified', selection)
        }
        self.selection = selection;
        self.plot.select(selection, {preventEvent: true});
        // self.plot.select([...this.dataLayer.getCurrentSelection().keys()]);
    }

    changeColoring(colorByCellType) {
        const self = this;
        if (colorByCellType) {
            self.plot.set({
                pointColorActive: self.colorMap,
                pointColorHover: self.colorMap,
            })
        } else {
            self.plot.set({
                pointColorActive: self.orangeMap,
                pointColorHover: self.orangeMap
            })
        }


    }

    select(args) {
        const self = this;
        console.log('Selection Size', _.size(args.points), args.points.sort());
        // TODO: remove any points that aren't in
        // self.plot.select(_.sampleSize(args.points, 100), {preventEvent: true});
        if (self.lassoActive && (!self.image || mode === 'multi')) {
            return dataLayer.getCells(args, self.dataset, self.image)
                .then(cells => {
                    if (self.image) {
                        self.eventHandler.trigger(Scatterplot.events.selectFromScatterplot, {
                            'selection': cells,
                            'selectionSource': 'Multi Image',
                            'dataset': self.dataset
                        })
                    } else {
                        self.eventHandler.trigger(Scatterplot.events.selectFromScatterplot, {
                            'selection': cells,
                            'selectionSource': 'Embedding'
                        })
                    }
                });
        } else if (self.image && mode === 'single') {
            self.plot.select([], {preventEvent: true});
        }
        console.log('Selection Done', self.id)
    }

    lassoStart() {
        const self = this;
        self.lassoActive = true;
    }

    lassoEnd(args) {
        const self = this;
        console.log(args);
        self.lastLasso = args;
        self.lassoActive = false;
    }

    async applyLasso(points) {
        return dataLayer.getCellsInPolygon(points, false, true)
            .then((cells) => {
                return cells;
            });

    }

    switchEditMode() {
        const self = this;
        self.editMode = !self.editMode;
        if (self.editMode) {
            self.customClusterDiv.style.visibility = "visible";
        } else {
            self.customClusterDiv.style.visibility = "hidden";
        }
    }

    async customCluster() {
        const self = this;
        let numberOfClusters = document.getElementById('custom_cluster_number')
        if (!numberOfClusters || !numberOfClusters.value) {
            return;
        }
        numberOfClusters = _.toInteger(numberOfClusters.value);
        // document.getElementById('custom_cluster_loading').innerHTML += '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>'
        try {
            let updatedNeighborhoods = await self.dataLayer.customCluster(numberOfClusters)
            self.neighborhoodTable.updateNeighborhoods(updatedNeighborhoods);
        } catch (e) {
        }
        // document.getElementById('custom_cluster_loading').innerHTML = '';
    }

    rewrangle() {
        const self = this;
        // let parent = document.getElementById(self.id).getBoundingClientRect()
        // const canvas = document.querySelector(`#${self.canvasId}`);
        // canvas.width = parent.width;
        // canvas.height = parent.height;
        // let {width, height} = canvas.getBoundingClientRect();
        // let ratio = window.devicePixelRatio;
        // width = width / ratio;
        // height = height / ratio;
        // scatterplot.set({width, height, canvas});
        self.plot.reset();
    }

    destroy() {
        const self = this;
        self.plot.destroy();
    }
}

// https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
function

hexToRGBA(hex, alpha) {
    hex = _.toUpper(hex);
    const h = "0123456789ABCDEF";
    let r = h.indexOf(hex[1]) * 16 + h.indexOf(hex[2]);
    let g = h.indexOf(hex[3]) * 16 + h.indexOf(hex[4]);
    let b = h.indexOf(hex[5]) * 16 + h.indexOf(hex[6]);
    let rgba = [r / 255, g / 255, b / 255, alpha]
    return rgba;

}

Scatterplot
    .events = {
    selectFromScatterplot: 'selectFromScatterplot'
};

