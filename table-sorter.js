(function( $, window, undefined ) {
    'use strict';

    var TableSorter = function() {
        this.init.apply( this, arguments );
    };

    var bindEvent = function( fn, ctx ) {
        var bindArgs = [].slice.call( arguments, 2 ), callbackArgs;
        return function() {
            callbackArgs = bindArgs.concat( this, [].slice.call( arguments ) );
            return fn.apply( ctx, callbackArgs );
        };
    };

    TableSorter.prototype = {
        rect: {},
        cloneTable: null,
        activeDrag: null,
        conditionDragObj: null,
        deleteHeightStyle: false,
        dragCells: [],
        dropTargetRectangles: [],

        init: function( el, options ) {
            this.cacheObjects( el );
            this.attachEvents();
            this.getRectCoords();
            this.initTableClone();
        },

        cacheObjects: function( el ) {
            this.cloneTableContainer = $( '<div />' );
            this.cloneRowContainer   = $( '<div />' );
            this.el    = el;
            this.table = $( el );
            this.tbody = el.tBodies[ 0 ];
            this.thead = el.tHead;
            this.rows  = this.tbody.children;
            this.cols  = $( this.rows ).children().filter( 'th' );
        },

        attachEvents: function() {
            $( this.cols ).bind( 'mousedown', bindEvent( this.startColsDrag, this ) );
            $( this.rows ).bind( 'mousedown', bindEvent( this.startRowsDrag, this ) );
        },

        getRectCoords: function() {
            var offset = this.table.offset();

            this.rect = {
                xmin: offset.left,
                ymin: offset.top,
                xmax: offset.left + this.el.offsetWidth,
                ymax: offset.top  + this.el.offsetHeight
            };
        },

        initTableClone: function() {
            this.cloneTable = this.table.clone( false ).css( { margin: 0, zIndex: 1, position: 'absolute' } );
            this.cloneTable.appendTo( this.cloneTableContainer );
            this.cloneTable.children().filter( 'thead, tfoot' ).remove();
            this.cloneRow = this.cloneTable.clone( false ).appendTo( this.cloneRowContainer );

            this.clearCloneTable( this.cloneTable );
            this.cloneRow.find( 'tbody' ).empty();
        },

        clearCloneTable: function( table ) {
            table.children().children().empty();
        },

        clearRowClone: function( row ) {
            row.children().filter( 'tbody' ).empty();
        },

        hideEmpty: function() {
            this.activeDrag === 'rows' ?
                this.cloneRow.appendTo( this.cloneRowContainer ) :
                this.cloneTable.appendTo( this.cloneTableContainer );

            $( '.empty-temp' ).removeClass( 'empty-object' ).removeClass( 'empty-temp' );

            if ( this.deleteHeightStyle ) {
                this.table.css( 'height', '' );
                this.deleteHeightStyle = false;
            }
        },

        cacheDropTargetRectangles: function( dropTargets, fixedHeight ) {
            this.dropTargetRectangles = [];

            for ( var i = 0; i < dropTargets.length; i++ ) {
                var targ       = dropTargets[ i ],
                    targPos    = $( targ ).offset(),
                    targWidth  = parseInt( targ.offsetWidth ),
                    targHeight = parseInt( targ.offsetHeight );

                this.dropTargetRectangles.push({
                    xmin: targPos.left,
                    xmax: targPos.left + targWidth,
                    ymin: targPos.top,
                    ymax: fixedHeight === true ? this.rect.ymax : targPos.top + targHeight,
                    dropTarget: targ
                });
            }
        },

        changePosition: function( e ) {
            if ( this.detectExitFromRect( e ) !== null ) {
                if ( this.activeDrag === 'cols' ) {
                    this.changeColPosition( e );
                } else {
                    this.changeRowPosition( e );
                }
            }
        },

        detectExitFromRect: function( e ) {
            var ulX = e.pageX - this.rect.xmin,
                ulY = e.pageY - this.rect.ymin;

            if ( ulX < 0 || ulX > this.rect.xmax - this.rect.xmin || ulY < 0 || ulY > this.rect.ymax - this.rect.ymin ) {
                return null;
            }
        },

        changeRowPosition: function( e ) {
            var elem = this.getCurrentTarget( e, "top" );

            if ( elem && elem.rowIndex > this.conditionDragObj.rowIndex ) {
                $( elem ).insertBefore( this.conditionDragObj );
                this.cacheDropTargetRectangles( this.rows );
                return false;
            }

            elem = this.getCurrentTarget( e, "bottom" );

            if ( elem && elem.rowIndex < this.conditionDragObj.rowIndex ) {
                $( elem ).insertAfter( this.conditionDragObj );
                this.cacheDropTargetRectangles( this.rows );
            }
        },

        changeColPosition: function( e ) {
            var elem, dragRowIndex;

            dragRowIndex = $( this.conditionDragObj ).parent()[ 0 ].rowIndex;
            elem = this.getCurrentTarget( e, "left" );

            if ( elem && elem.cellIndex > this.conditionDragObj.cellIndex ) {
                this.moveColToRight( elem, dragRowIndex );
                return false;
            }

            elem = this.getCurrentTarget( e, "right" );

            if ( elem && elem.cellIndex < this.conditionDragObj.cellIndex ) {
                this.moveColToLeft( elem, dragRowIndex );
            }
        },

        moveColToLeft: function( elem, dragRowIndex ) {
            var drop, tempDrop = [];

            drop = $( this.tbody ).children().filter( function() {
                if ( this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex ) {
                    tempDrop.push( $( this ).children().eq( elem.cellIndex ) );
                }
            });

            drop = tempDrop;

            for ( var i = 0; i < this.dragCells.length; i++ ) {
                $( this.dragCells[ i ] ).insertBefore( drop[ i ] );
            }

            this.conditionDragObj = this.dragCells[ 0 ];
            this.cacheDropTargetRectangles( $( this.conditionDragObj ).parent().children(), true );
        },

        moveColToRight: function( elem, dragRowIndex ) {
            var drop, tempDrop = [];

            drop = $( this.tbody ).children().filter( function() {
                if ( this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex ) {
                    tempDrop.push( $( this ).children().eq( elem.cellIndex ) );
                }
            });

            drop = tempDrop;

            for ( var i = 0; i < this.dragCells.length; i++ ) {
                $( this.dragCells[ i ] ).insertAfter( drop[ i ] );
            }

            this.conditionDragObj = this.dragCells[ 0 ];
            this.cacheDropTargetRectangles( $( this.conditionDragObj ).parent().children(), true );
        },

        getCurrentTarget: function( e, orientation ) {
            for ( var i = 0; i < this.dropTargetRectangles.length; i++ ) {
                var rect       = this.dropTargetRectangles[ i ],
                    halfWidth  = rect.xmin + ( rect.xmax - rect.xmin ) / 2,
                    halfHeight = rect.ymin + ( rect.ymax - rect.ymin ) / 2;

                switch ( orientation ) {
                    case "left": {
                        if ( e.pageX > halfWidth && e.pageX < rect.xmax && e.pageY > rect.ymin && e.pageY < rect.ymax ) {
                            return rect.dropTarget;
                        }
                    } break;

                    case "right": {
                        if ( e.pageX < halfWidth && e.pageX > rect.xmin && e.pageY > rect.ymin && e.pageY < rect.ymax ) {
                            return rect.dropTarget;
                        }
                    } break;

                    case "top": {
                        if ( e.pageX > rect.xmin && e.pageX < rect.xmax && e.pageY > halfHeight && e.pageY < rect.ymax ) {
                            return rect.dropTarget;
                        }
                    } break;

                    case "bottom": {
                        if ( e.pageX > rect.xmin && e.pageX < rect.xmax && e.pageY < halfHeight && e.pageY > rect.ymin ) {
                            return rect.dropTarget;
                        }
                    } break;
                }
            }

            return false;
        },

        addDocumentEventHandlers: function() {
            $( document ).bind({
                mousemove: bindEvent( this.mousemove, this ),
                mouseup:   bindEvent( this.mouseup, this )
            });

            document.ondragstart = function() {
                return false;
            };

            document.body.onselectstart = function() {
                return false;
            };
        },

        removeDocumentEventHandlers: function() {
            $( document ).unbind( 'mousemove mouseup' );
            document.ondragstart = null;
            document.body.onselectstart = null;
        },

        getMouseOffset: function( target, x, y ) {
            var docPos = $( target ).offset();
            return { x: x - docPos.left, y: y - docPos.top };
        },

        showDrag: function( e ) {
            if ( this.dragObject ) {
                this.dragObject.style.left = e.pageX - this.mouseOffset.x + 'px';
                this.dragObject.style.top  = e.pageY - this.mouseOffset.y + 'px';
                this.changePosition( e );
            }
        },

        getTdClone: function( elem ) {
            return elem.clone( false ).css({
                height: elem.height(),
                width: elem.width()
            });
        },

        getTrClone: function( row ) {
            var clone = row.clone( false ).empty(), data, item;

            row.children().each( function() {
                item = $( this );
                data = {
                    height: item.height(),
                    width:  item.width()
                };

                item.clone( false ).css( data ).appendTo( clone );
            });

            return clone;
        },

        setDragColumn: function( col ) {
            var colNum = col.cellIndex, coords = $( col ).offset(), td, tr, tempRows, dragRowIndex,
                cloneTableWidth, cloneTableChildren, cloneTableCellspacing, cloneTableBorder;

            this.dragCells = [ col ];

            cloneTableCellspacing = this.cloneTable[ 0 ].getAttribute( 'cellspacing' );
            cloneTableBorder = this.cloneTable[ 0 ].getAttribute( 'border' );
            cloneTableWidth = $( col ).outerWidth() + cloneTableCellspacing * 2 + cloneTableBorder * 2;
            this.cloneTable.width( cloneTableWidth );

            cloneTableChildren = this.cloneTable.children().children();
            cloneTableChildren.filter( 'tr:first' ).append( this.getTdClone( $( col ) ) );
            tr = cloneTableChildren.slice( 1 ).show();

            $( col ).addClass( 'empty-temp' );

            dragRowIndex = $( this.conditionDragObj ).parent()[ 0 ].rowIndex;
            tempRows = $( this.tbody ).children().filter( function() {
                if ( this.rowIndex > dragRowIndex ) {
                    return this;
                }
            }).get();

            for ( var i = 0; i < tempRows.length; i++ ) {
                td = $( tempRows[ i ] ).children().eq( colNum );
                this.dragCells.push( td[ 0 ] );
                $( tr[ i ] ).append( this.getTdClone( td ) );
                td.addClass( 'empty-temp' );
            }

            tr.filter( function() {
                if ( $( this ).children().length === 0 ) {
                    $( this ).hide();
                }
            });

            this.cloneTable.css({
                left: coords.left,
                top:  coords.top
            });
        },

        setDragRow: function( row ) {
            var $row = $( row ),
                coords = $row.offset();

            this.cloneRow.width( $row.width() );
            this.cloneRow.append( this.getTrClone( $row ) );

            $row.find( 'td' ).addClass( 'empty-temp' );
            this.cloneRow.css({
                left: coords.left,
                top: coords.top
            });
        },

        startColsDrag: function( eventContext, e ) {
            this.getRectCoords();
            this.conditionDragObj = eventContext;
            this.cacheDropTargetRectangles( $( eventContext ).parent().children(), true );
            this.clearCloneTable( this.cloneTable );
            this.setDragColumn( eventContext );

            this.activeDrag = 'cols';
            this.mouseDownAt = {
                x: e.pageX,
                y: e.pageY,
                dragObject: this.cloneTable[ 0 ]
            };
            this.addDocumentEventHandlers();
            document.body.style.cursor = 'move';

            return false;
        },

        startRowsDrag: function( eventContext, e ) {
            if ( this.el.style["height"] === "" ) {
                this.deleteHeightStyle = true;
            }

            this.table.height( this.table.height() );

            this.getRectCoords();
            this.conditionDragObj = eventContext;
            this.cacheDropTargetRectangles( this.rows );
            this.clearRowClone( this.cloneRow );
            this.setDragRow( eventContext );

            this.activeDrag = 'rows';
            this.mouseDownAt = {
                x: e.pageX,
                y: e.pageY,
                dragObject: this.cloneRow[ 0 ]
            };
            this.addDocumentEventHandlers();
            document.body.style.cursor = 'move';

            return false;
        },

        mousemove: function( eventContext, e ) {
            if ( this.mouseDownAt ) {
                if ( Math.abs( this.mouseDownAt.x - e.pageX ) < 10 &&
                     Math.abs( this.mouseDownAt.y - e.pageY ) < 10 )
                {
                    return;
                }

                this.dragObject = this.mouseDownAt.dragObject;

                if ( this.activeDrag === 'rows' ) {
                    this.cloneRow.appendTo( 'body' );
                } else {
                    this.cloneTable.appendTo( 'body' );
                }

                this.mouseOffset = this.getMouseOffset( this.dragObject, this.mouseDownAt.x, this.mouseDownAt.y );
                this.mouseDownAt = null;
                $( '.empty-temp' ).addClass( 'empty-object' );
            }

            this.showDrag( e );
        },

        mouseup: function() {
            if ( !this.dragObject ) {
                this.mouseDownAt = null;
            }
            this.dragObject = null;
            this.hideEmpty();
            this.removeDocumentEventHandlers();
            document.body.style.cursor = '';
        }
    };

    $.fn.TableSorter = function( options ) {
        var item, entity;
        $( this ).each( function() {
            item = $( this );
            if ( item.data( 'TableSorter' ) ) {
                console.log( 'TableSorter already init', this );
            } else {
                entity = new TableSorter( this, options );
                item.data( 'TableSorter', entity );
            }
        });
    };

})( jQuery, window, undefined );