/*
     jQuery <Sorter plugin>
 */

(function( $ ) {
    function Sorter( table, options ) {
        var dragObject = null, mouseOffset, mouseDownAt, activeDrag, conditionDragObj,
            tbody, thead, rows, cols, rect, api, $table,
            cloneTable, cloneRow, cloneTableContainer = $( '<div />' ), cloneRowContainer = $( '<div />' ),
            dragCells = [], dropTargetRectangles = [], deleteHeightStyle = false;

        function init() {
            $table = $( table );
            tbody  = table.tBodies[ 0 ],
            thead  = table.tHead,
            rows   = tbody.children,
            cols   = $( rows ).children().filter( 'th' );
            
            $( cols ).bind( 'mousedown', startColsDrag );
            $( rows ).bind( 'mousedown', startRowsDrag );
            getRectCoords();
            initTableClone();
            $table.data( 'sorter', api );
        }

        function getRectCoords() {
            var offset = $table.offset();

            rect = {
                xmin: offset.left,
                ymin: offset.top,
                xmax: offset.left + table.offsetWidth,
                ymax: offset.top  + table.offsetHeight
            };
        }

        function initTableClone() {
            cloneTable = $table.clone( false ).css({
                margin: 0,
                zIndex: 1,
                position: 'absolute'
            });
            cloneTable.appendTo( cloneTableContainer );
            cloneTable.children().filter( 'thead, tfoot' ).remove();
            cloneRow = cloneTable.clone( false ).appendTo( cloneRowContainer );

            clearCloneTable( cloneTable );
            cloneRow.find( 'tbody' ).empty();
        }

        function clearCloneTable( table ) {
            table.children().children().empty();
        }

        function clearRowClone( row ) {
            row.children().filter( 'tbody' ).empty();
        }

        function hideEmpty() {
            activeDrag === 'rows' ?
                cloneRow.appendTo( cloneRowContainer ) :
                cloneTable.appendTo( cloneTableContainer );

            $( '.empty-temp' ).removeClass( 'empty-object' ).removeClass( 'empty-temp' );

            if ( deleteHeightStyle ) {
                $table.css( 'height', '' );
                deleteHeightStyle = false;
            }
        }

        function cacheDropTargetRectangles( dropTargets, fixedHeight ) {
            dropTargetRectangles = [];

            for ( var i = 0; i < dropTargets.length; i++ ) {
                var targ       = dropTargets[ i ],
                    targPos    = $( targ ).offset(),
                    targWidth  = parseInt( targ.offsetWidth ),
                    targHeight = parseInt( targ.offsetHeight );

                dropTargetRectangles.push({
                    xmin: targPos.left,
                    xmax: targPos.left + targWidth,
                    ymin: targPos.top,
                    ymax: fixedHeight === true ? rect.ymax : targPos.top + targHeight,
                    dropTarget: targ
                });
            }
        }

        function changePosition( e ) {
            if ( detectExitFromRect( e ) !== null ) {
                if ( activeDrag === 'cols' ) {
                    changeColPosition( e );
                } else {
                    changeRowPosition( e );
                }
            }
        }

        function detectExitFromRect( e ) {
            var ulX = e.pageX - rect.xmin,
                ulY = e.pageY - rect.ymin;

            if ( ulX < 0 || ulX > rect.xmax - rect.xmin || ulY < 0 || ulY > rect.ymax - rect.ymin ) {
                return null;
            }
        }

        function changeRowPosition( e ) {
            var elem = getCurrentTarget( e, "top" );

            if ( elem && elem.rowIndex > conditionDragObj.rowIndex ) {
                $( elem ).insertBefore( conditionDragObj );
                cacheDropTargetRectangles( rows );
                return false;
            }

            elem = getCurrentTarget( e, "bottom" );

            if ( elem && elem.rowIndex < conditionDragObj.rowIndex ) {
                $( elem ).insertAfter( conditionDragObj );
                cacheDropTargetRectangles( rows );
            }
        }

        function changeColPosition( e ) {
            var elem, drop, dragRowIndex, tempDrop = [], condition, top, i;

            dragRowIndex = $( conditionDragObj ).parent()[ 0 ].rowIndex;

            elem = getCurrentTarget( e, "left" );
            if ( elem && elem.cellIndex > conditionDragObj.cellIndex ) {
                drop = $( tbody ).children().filter( function() {
                    if ( this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex ) {
                        tempDrop.push( $( this ).children().eq( elem.cellIndex ) );
                    }
                });

                drop = tempDrop;

                for ( i = 0; i < dragCells.length; i++ ) {
                    $( dragCells[ i ] ).insertAfter( drop[ i ] );
                }

                conditionDragObj = dragCells[ 0 ];
                cacheDropTargetRectangles( $( conditionDragObj ).parent().children(), true );

                return false;
            }

            elem = getCurrentTarget( e, "right" );
            if ( elem && elem.cellIndex < conditionDragObj.cellIndex ) {
                drop = $( tbody ).children().filter( function() {
                    if ( this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex ) {
                        tempDrop.push( $( this ).children().eq( elem.cellIndex ) );
                    }
                });

                drop = tempDrop;

                for ( i = 0; i < dragCells.length; i++ ) {
                    $( dragCells[ i ] ).insertBefore( drop[ i ] );
                }

                conditionDragObj = dragCells[ 0 ];
                cacheDropTargetRectangles( $( conditionDragObj ).parent().children(), true );
            }
        }

        function getCurrentTarget( e, orientation ) {
            for ( var i = 0; i < dropTargetRectangles.length; i++ ) {
                var rect = dropTargetRectangles[ i ],
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
        }

        function addDocumentEventHandlers() {
            $( document ).bind({
                mousemove: mousemove,
                mouseup: mouseup
            });

            document.ondragstart = function() {
                return false;
            };

            document.body.onselectstart = function() {
                return false;
            };
        }

        function removeDocumentEventHandlers() {
            $( document ).unbind( 'mousemove mouseup' );
            document.ondragstart = null;
            document.body.onselectstart = null;
        }

        function getMouseOffset( target, x, y ) {
            var docPos = $( target ).offset();
            return { x: x - docPos.left, y: y - docPos.top };
        }

        function showDrag( e ) {
            if ( dragObject ) {
                dragObject.style.left = e.pageX - mouseOffset.x + 'px';
                dragObject.style.top  = e.pageY - mouseOffset.y + 'px';
                changePosition( e );
            }
        }

        function getTdClone( elem ) {
            return elem.clone( false ).css({
                height: elem.height(),
                width: elem.width()
            });
        }

        function getTrClone( row ) {
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
        }

        function setDragColumn( col ) {
            var colNum = col.cellIndex, coords = $( col ).offset(), td, tr, tempRows, dragRowIndex,
                cloneTableWidth, cloneTableChildren, cloneTableCellspacing, cloneTableBorder;

            dragCells = [ col ];

            cloneTableCellspacing = cloneTable[ 0 ].getAttribute( 'cellspacing' );
            cloneTableBorder = cloneTable[ 0 ].getAttribute( 'border' );
            cloneTableWidth = $( col ).outerWidth() + cloneTableCellspacing * 2 + cloneTableBorder * 2;
            cloneTable.width( cloneTableWidth );

            cloneTableChildren = cloneTable.children().children();
            cloneTableChildren.filter( 'tr:first' ).append( getTdClone( $( col ) ) );
            tr = cloneTableChildren.slice( 1 ).show();

            $( col ).addClass( 'empty-temp' );

            dragRowIndex = $( conditionDragObj ).parent()[ 0 ].rowIndex;
            tempRows = $( tbody ).children().filter( function() {
                if ( this.rowIndex > dragRowIndex ) {
                    return this;
                }
            }).get();

            for ( var i = 0; i < tempRows.length; i++ ) {
                td = $( tempRows[ i ] ).children().eq( colNum );
                dragCells.push( td[ 0 ] );
                $( tr[ i ] ).append( getTdClone( td ) );
                td.addClass( 'empty-temp' );
            }

            tr.filter( function() {
                if ( $( this ).children().length === 0 ) {
                    $( this ).hide();
                }
            });

            cloneTable.css({
                left: coords.left,
                top:  coords.top
            });
        }

        function setDragRow( row ) {
            var $row = $( row ),
                coords = $row.offset();

            cloneRow.width( $row.width() );
            cloneRow.append( getTrClone( $row ) );

            $row.find( 'td' ).addClass( 'empty-temp' );
            cloneRow.css({
                left: coords.left,
                top: coords.top
            });
        }

        function startColsDrag( e ) {
            getRectCoords();
            conditionDragObj = this;
            cacheDropTargetRectangles( $( this ).parent().children(), true );
            clearCloneTable( cloneTable );
            setDragColumn( this );

            activeDrag = 'cols';
            mouseDownAt = {
                x: e.pageX,
                y: e.pageY,
                dragObject: cloneTable[ 0 ]
            };
            addDocumentEventHandlers();
            document.body.style.cursor = 'move';

            return false;
        }

        function startRowsDrag( e ) {
            if ( table.style["height"] === "" ) {
                deleteHeightStyle = true;
            }

            $table.height( $table.height() );

            getRectCoords();
            conditionDragObj = this;
            cacheDropTargetRectangles( rows );
            clearRowClone( cloneRow );
            setDragRow( this );

            activeDrag = 'rows';
            mouseDownAt = {
                x: e.pageX,
                y: e.pageY,
                dragObject: cloneRow[ 0 ]
            };
            addDocumentEventHandlers();
            document.body.style.cursor = 'move';

            return false;
        }

        function mousemove( e ) {
            if ( mouseDownAt ) {

                if ( Math.abs( mouseDownAt.x - e.pageX ) < 10 && Math.abs( mouseDownAt.y - e.pageY ) < 10 ) {
                    return;
                }

                dragObject = mouseDownAt.dragObject;

                if ( activeDrag === 'rows' ) {
                    cloneRow.appendTo( 'body' );
                } else {
                    cloneTable.appendTo( 'body' );
                }

                mouseOffset = getMouseOffset( dragObject, mouseDownAt.x, mouseDownAt.y );
                mouseDownAt = null;
                $( '.empty-temp' ).addClass( 'empty-object' );
            }

            showDrag( e );
        }

        function mouseup() {
            if ( !dragObject ) {
                mouseDownAt = null;
            }
            dragObject = null;
            hideEmpty();
            removeDocumentEventHandlers();
            document.body.style.cursor = '';
        }

        api = {
            stopRowsDrag: function() {
                $( rows ).unbind( 'mousedown' );
            },
            stopColsDrag: function() {
                $( cols ).unbind( 'mousedown' );
            },
            startRowsDrag: function() {
                $( rows ).bind( 'mousedown', startRowsDrag );
            },
            startColsDrag: function() {
                $( cols ).bind( 'mousedown', startColsDrag );
            },

            addRow: function() {
                var tr = $( '<tr>' ), length = $( rows ).filter( 'tr:last' ).children().length, i = 0;

                do {
                    tr.append( $( '<td>' ) );
                    i++;
                }
                while ( i < length )

                tr.bind( 'mousedown', event, startRowsDrag ).appendTo( table );
                rows = tbody.children;
                getRectCoords();
                cloneTable.append( $( '<tr>' ) );
            },

            addCol: function() {
                $( rows ).each( function() {
                    $( this ).append( $( '<td>' ) );
                });

                getRectCoords();
            },

            delRow: function( numRow ) {
                var num = numRow === undefined ? rows.length - 1 : numRow - 1;

                $( rows[ num ] ).remove();
                rows = tbody.children;
                getRectCoords();
                cloneTable.children().children().eq( num ).remove();
            },

            delCol: function( numCol ) {
                var num, LENGTH = $( rows[ 0 ] ).children().length;

                if ( numCol === undefined ) {
                    num = LENGTH - 1;
                } else if ( numCol > LENGTH ) {
                    return;
                } else {
                    num = numCol - 1;
                }

                $( rows ).each( function() {
                    $( this ).children().eq( num ).remove();
                });

                cols = $( rows ).children().filter( 'th' );
                getRectCoords();
            },

            startEditMode: function() {
                var text, input = null, td, width, height;

                $table.delegate( 'td, th', 'click', function( e ) {
                    if ( $( this ).hasClass( 'edit-mode-on' ) ) {
                        return false;
                    }

                    if ( input !== null ) {
                        input.trigger( 'focusout' );
                    }

                    input  = $( '<textarea>' );
                    td     = $( this ).addClass( 'edit-mode-on' );
                    width  = td.width() - 4;
                    height = td.height() - 4;
                    text   = td.text();

                    td.text( "" ).append( input );

                    input
                        .val( text )
                        .focus()
                        .css( { display: "block", width: width, height: height } )
                        .focusout( function() {
                            text = input.val();
                            input.remove();
                            input = null;
                            td.text( text ).removeClass( 'edit-mode-on' );
                        })
                        .keydown( function( e ) {
                            if ( e.keyCode === 13 || e.keyCode === 27 ) {
                                $( this ).trigger( 'focusout' );
                            }
                        })
                        .click( function( e ) {
                            e.stopPropagation();
                        });

                    e.stopPropagation();
                });
            },

            stopEditMode: function() {
                $table.unbind( 'click' );
            }
        };

        init();
    }

    $.fn.sorter = function( options ) {
        var item, entity;
        $( this ).each( function() {
            item = $( this );
            if ( item.data( 'sorter' ) ) {
                console.log( 'Sorter already init', this );
            } else {
                entity = Sorter( this, options );
                item.data( 'sorter', entity );
            }
        });
    }
})( jQuery );