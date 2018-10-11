var app = new Vue({
    el: '#items',
    data: {
        items: [],
        newItem: '',
        urlroot: '',
        itemname: '',
        ratelimitExceeded: false,
        timer: '',
    },
    created: function() {
        this.urlroot = 'http://localhost:3000/';
        let lastUrlPart = window.location.pathname.split('/')[2];
        console.log(lastUrlPart);
        if (lastUrlPart === 'skus.html') {
            this.urlroot += 'sku/';
            this.itemname = 'SKU';
        } else if (lastUrlPart === 'brands.html') {
            this.urlroot += 'brand/';
            this.itemname = 'Marke'
        } else {
            this.urlroot += 'category/';
            //todo
        }
        this.loadItems();
    },
    beforeDestroy: function() {
        clearInterval(this.timer);
    },
    methods: {
        loadItems: function() {
            this.$http.get(this.urlroot + 'get').then(response => {
                if (response.headers.map["Content-Type"][0] === "application/json; charset=utf-8") {
                    if (typeof response.body === "string") {
                        this.ratelimitExceeded = true;
                        this.timer = setInterval(this.loadItems, 150000); //todo kann entfernt werden, wenn der fetcher läuft
                    } else {
                        this.items = response.body;
                        clearInterval(this.timer)
                    }
                } else {
                    window.location.href = '/';
                }
            }, response => {
                console.log('Error while fetching the skus');
            })
        },
        deleteItem: function(item) {
            this.$http.post(this.urlroot + 'delete', item).then(response => {
                this.loadItems();
            });
            this.newItem = '';
        },
        addItem: function(item) {
            let body = [{
                field1: item
            }]
            this.$http.post(this.urlroot + 'add', body).then(response => {
                this.loadItems();
            })
            this.newItem = '';
        },
        isChildOf: function(item, parentId) {
            return item.parent === parentId;
        },
        filterItems: function(id) {
            return this.items.filter(x => x.parent === id);
        }

    }
})


$(function() {
    $('.list-group-item').on('click', function() {
        $('.fa', this)
            .toggleClass('fa-caret-right')
            .toggleClass('fa-caret-down');
    });

});