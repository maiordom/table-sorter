/*!
 * jQuery table-sorter plugin
 * 
 * Copyright 2011, Zhulanov Vadim
 * Liscensed under the MIT License
 * http://github.com/maiordom/table-sorter/MIT-LICENSE.txt
 *
 * Date: 11/09/2011
 *
 * @requires jQuery v1.3.2 or later
 *
 * @example $('table').tableSorter();
 *
 * @requires CSS class "empty-object", "edit-mode-on"
 * @example
 * .empty-object {background:#034 !important; color:#034 !important;}
 */
(function($)
{
    var tableSorter = [];

    function filterTable(sortedTables, method)
    {
        if (tableSorter.length === 0) {return sortedTables.filter('table');}

        var result = [];
		
        sortedTables.filter('table').each(function()
        {
            for (var i = 0, j = 0; i < tableSorter.length; i++)
            {
                if (tableSorter[i].target === this)
                {
                    try {tableSorter[i][method]();}
                    catch (e){}
                }
                else {j++;}
            }
            
            if (j === tableSorter.length) 
            {
                result.push(this);
            }
        });
			
        return $(result);
    }
	
    function checkEmptyTable(table, table_methods)
    {
        var
            tr, input, is_footer = true,
            
            t_children = $(table).children(),
            tfoot      = t_children.filter('tfoot'),
            methods    = 'addCol addRow delRow delCol'.split(' ');

        if (t_children.filter('tbody').children().length === 0)
        {
            if (tfoot.length === 0)
            {
                tfoot = $('<tfoot>').appendTo(table);
                is_footer = false;
            }
            
            tr = $('<tr>').appendTo(tfoot);

            for (var i = 0; i < methods.length; i++)
            {
                input = $('<input>', {type: 'button', value: methods[i]});
                tr.append( $('<td>').append(input) );

                (function(method)
                {
                    input.click(function()
                    {
                        table_methods[method]();
                    });
                })(methods[i]);
            }
            
            input = $('<input>', {type: 'button', value: 'disableEditMode'});
            tr.append( $('<td>').append(input) );

            input.click(function()
            {
                if (is_footer) {tr.remove();}
                else           {tfoot.remove();}
            });
        }
    }

    $.fn.tableSorter = function(options)
    {
        filterTable(this, options).each(function(i)
        {    
            var
                dragObject = null, mouseOffset, mouseDownAt, activeDrag, cloneTable, cloneRow, conditionDragObj,
                dragCells = [], cloneTableContainer = $('<div></div>'), cloneRowContainer = $('<div></div>'),
                dropTargetRectangles = [], rect, deleteHeightStyle = false,
            
                table  = this,                
                tbody  = table.tBodies[0],
                thead  = table.tHead,
                rows   = tbody.children,
                cols   = $(rows).children().filter('th');

            function getRectCoords()
            {
                var offset = $(table).offset();
                
                rect =
                {
                    xmin: offset.left,
                    ymin: offset.top,
                    xmax: offset.left + table.offsetWidth,
                    ymax: offset.top  + table.offsetHeight
                };
            }
            
            getRectCoords();

            function initTableClone(table)
            {
                cloneTable = $(table).clone(false).css({margin: 0, zIndex:1, position:'absolute'}).appendTo(cloneTableContainer);
                cloneTable.children().filter('thead, tfoot').remove();
                cloneRow = cloneTable.clone(false).appendTo(cloneRowContainer);

                clearTableClone(cloneTable);
                cloneRow.find('tbody').empty();
            }
            
            function clearTableClone(table) 
            {
                table.children().children().empty();
            }
            
            function clearRowClone(row)
            {
                row.children().filter('tbody').empty();
            }
            
            function hideEmpty()
            {
                activeDrag === 'rows' ? cloneRow.appendTo(cloneRowContainer) : cloneTable.appendTo(cloneTableContainer);
                
                $('.empty-temp').removeClass('empty-object').removeClass('empty-temp');
                
                if (deleteHeightStyle)
                {
                    $(table).css('height', '');
                    deleteHeightStyle = false;
                }
            }
            
            function cacheDropTargetRectangles(dropTargets, fixedHeight)
            {
                dropTargetRectangles = [];
         
                for (var i = 0; i < dropTargets.length; i++)
                {
                    var 
                        targ       = dropTargets[i],
                        targPos    = $(targ).offset(),
                        targWidth  = parseInt(targ.offsetWidth),
                        targHeight = parseInt(targ.offsetHeight);
         
                    dropTargetRectangles.push(
                    {
                        xmin: targPos.left,
                        xmax: targPos.left + targWidth,
                        ymin: targPos.top,
                        ymax: fixedHeight === true ? rect.ymax : targPos.top + targHeight,
                        dropTarget: targ
                    });
                }
            }
            
            function changePosition(e)
            {                
                if (detectExitFromRect(e) !== null)
                {
                    if (activeDrag === 'cols') {changeColPosition(e);}
                    else                       {changeRowPosition(e);}
                }
            }
            
            function detectExitFromRect(e)
            {
                var
                    ulX  = e.pageX - rect.xmin,
                    ulY  = e.pageY - rect.ymin;

                if ( ulX < 0 || ulX > rect.xmax - rect.xmin || ulY < 0 || ulY > rect.ymax - rect.ymin)
                {
                    return null;
                }
            }
            
            function changeRowPosition(e)
            {
                var elem = getCurrentTarget(e, "top");
                
                if (elem && elem.rowIndex > conditionDragObj.rowIndex)
                {
                    $(elem).insertBefore(conditionDragObj);
                    cacheDropTargetRectangles(rows);
                    return false;
                }

                elem = getCurrentTarget(e, "bottom");
                
                if (elem && elem.rowIndex < conditionDragObj.rowIndex)
                {
                    $(elem).insertAfter(conditionDragObj);
                    cacheDropTargetRectangles(rows);
                }
            }
            
            function changeColPosition(e)
            {
                var elem, drop, dragRowIndex, tempDrop = [], condition, top;

                dragRowIndex = $(conditionDragObj).parent()[0].rowIndex;
                
                elem = getCurrentTarget(e, "left");                
                if (elem && elem.cellIndex > conditionDragObj.cellIndex)
                {
                    drop = $(tbody).children().filter(function()
                    {
                        if (this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex)
                        {
                            tempDrop.push($(this).children().eq(elem.cellIndex));
                        }
                    });
                    
                    drop = tempDrop;
                    
                    for (var i = 0; i < dragCells.length; i++)
                    {
                        $(dragCells[i]).insertAfter(drop[i]);
                    }
                    
                    conditionDragObj = dragCells[0];
                    cacheDropTargetRectangles( $(conditionDragObj).parent().children(), true );
                    
                    return false;
                }

                elem = getCurrentTarget(e, "right");
                if (elem && elem.cellIndex < conditionDragObj.cellIndex)
                {
                    drop = $(tbody).children().filter(function()
                    {
                        if (this.rowIndex === dragRowIndex || this.rowIndex > dragRowIndex)
                        {
                            tempDrop.push($(this).children().eq(elem.cellIndex));
                        }
                    });
                    
                    drop = tempDrop;
                    
                    for (var i = 0; i < dragCells.length; i++)
                    {
                        $(dragCells[i]).insertBefore(drop[i]);
                    }
                    
                    conditionDragObj = dragCells[0];
                    cacheDropTargetRectangles( $(conditionDragObj).parent().children(), true );
                }
            }
            
            function getCurrentTarget(e, orientation)
            {
                for (var i = 0; i < dropTargetRectangles.length; i++)
                {
                    var 
                        rect       = dropTargetRectangles[i], 
                        halfWidth  = rect.xmin + (rect.xmax - rect.xmin) / 2,
                        halfHeight = rect.ymin + (rect.ymax - rect.ymin) / 2;       
                                
                    switch(orientation)
                    {
                        case "left":
                        {
                            if((e.pageX > halfWidth) && (e.pageX < rect.xmax) && (e.pageY > rect.ymin) && (e.pageY < rect.ymax))
                            {
                                return rect.dropTarget;
                            }
                        }break;
                        
                        case "right":
                        {
                            if((e.pageX < halfWidth) && (e.pageX > rect.xmin) && (e.pageY > rect.ymin) && (e.pageY < rect.ymax))
                            {
                                return rect.dropTarget;
                            }
                        }break;
                        
                        case "top":
                        {
                            if((e.pageX > rect.xmin) && (e.pageX < rect.xmax) && (e.pageY > halfHeight) && (e.pageY < rect.ymax))
                            {                                
                                return rect.dropTarget;
                            }
                        }break;
                        
                        case "bottom":
                        {
                            if((e.pageX > rect.xmin) && (e.pageX < rect.xmax) && (e.pageY < halfHeight) && (e.pageY > rect.ymin))
                            {                                
                                return rect.dropTarget;
                            }
                        }break;                    
                    }
                }  
                
                return false;
            }
            
            function addDocumentEventHandlers()
            {
                $(document).bind(
                {
                    'mousemove': function(e) {mousemove(e);},
                    'mouseup'  : function(e) {mouseup(e);}
                });
                
                document.ondragstart        = function(){return false;}
                document.body.onselectstart = function(){return false;}
            }
            
            function removeDocumentEventHandlers()
            {
                $(document).unbind('mousemove mouseup');
                document.ondragstart = null;
                document.body.onselectstart = null;
            }
            
            function getMouseOffset(target, x, y)
            {
                var docPos = $(target).offset();
                return {x: x - docPos.left, y: y - docPos.top};
            }
            
            function showDrag(e)
            {
                if (dragObject)
                {                    
                    dragObject.style.left = e.pageX - mouseOffset.x + 'px';
                    dragObject.style.top  = e.pageY - mouseOffset.y + 'px';                    
                    changePosition(e);
                }
            }
            
            function getTdClone(elem)
            {
                return elem.clone(false).css({height: elem.height(), width: elem.width()});
            }
            
            function getTrClone(row)
            {
                var clone = row.clone(false).empty(), data;
                
                row.children().each(function()
                {
                    data = 
                    {
                        height: $(this).height(), 
                        width:  $(this).width()   
                    };
                
                    $(this).clone(false).css(data).appendTo(clone);
                });
                
                return clone;
            }
            
            function setDragColumn(col)
            {
                var colNum = col.cellIndex, td, tr, coord = $(col).offset(), tempRows, dragRowIndex, children;

                dragCells = [col];

                cloneTable.width( $(col).outerWidth() + cloneTable[0].getAttribute('cellspacing') * 2 + cloneTable[0].getAttribute('border') * 2 );

                children = cloneTable.children().children();
                children.filter('tr:first').append( getTdClone($(col)) );
                tr = children.slice(1).show();

                $(col).addClass('empty-temp');

                dragRowIndex = $(conditionDragObj).parent()[0].rowIndex;
                tempRows = $(tbody).children().filter(function()
                {
                    if (this.rowIndex > dragRowIndex)
                    {
                        return this;
                    }
                }).get();

                for (var i = 0; i < tempRows.length; i++)
                {
                    td = $(tempRows[i]).children().eq(colNum);
                    dragCells.push(td[0]);
                    $(tr[i]).append(getTdClone(td));
                    td.addClass('empty-temp');
                }

                tr.filter(function()
                {
                    if ($(this).children().length === 0) {$(this).hide();}
                });
                
                cloneTable.css({left: coord.left, top: coord.top});
            }
            
            function setDragRow(row)
            {
                var coord = $(row).offset();

                cloneRow.width( $(row).width() );
                cloneRow.append(getTrClone($(row)));                
                
                $('td', row).addClass('empty-temp');
                cloneRow.css({left: coord.left, top: coord.top});
            }
            
            function startColsDrag(e)
            {
                getRectCoords();
                conditionDragObj = this;
                cacheDropTargetRectangles( $(this).parent().children(), true );
                clearTableClone(cloneTable);
                setDragColumn(this);

                activeDrag = 'cols';
                mouseDownAt = {x: e.pageX, y: e.pageY, dragObject: cloneTable[0]};
                addDocumentEventHandlers();

                return false;
            }
            
            function startRowsDrag(e)
            {
                if (table.style["height"] === "") {deleteHeightStyle = true;}
                $(table).height( $(table).height() );

                getRectCoords();
                conditionDragObj = this;
                cacheDropTargetRectangles(rows);
                clearRowClone(cloneRow);
                setDragRow(this);

                activeDrag = 'rows';
                mouseDownAt = {x: e.pageX, y: e.pageY, dragObject: cloneRow[0]};
                addDocumentEventHandlers();

                return false;
            }
            
            function mousemove(e)
            {
                if (mouseDownAt)
                {
                    if (Math.abs(mouseDownAt.x - e.pageX) < 10 && Math.abs(mouseDownAt.y - e.pageY) < 10)
                    {
                        return;
                    }
                    dragObject = mouseDownAt.dragObject;

                    if (activeDrag === 'rows') {cloneRow.appendTo('body');}
                    else                       {cloneTable.appendTo('body');}

                    mouseOffset = getMouseOffset(dragObject, mouseDownAt.x, mouseDownAt.y);
                    mouseDownAt = null;
                    $('.empty-temp').addClass('empty-object');
                }
                showDrag(e);
            }
            
            function mouseup()
            {
                if (!dragObject) {mouseDownAt = null;}
                dragObject = null;
                hideEmpty();
                removeDocumentEventHandlers();
            }

            $(cols).bind('mousedown', startColsDrag);
            $(rows).bind('mousedown', startRowsDrag);

            initTableClone(table);

            tableSorter.push(
            {
                target: table,
                
                stopRowsDrag:  function() {$(rows).unbind('mousedown');},
                stopColsDrag:  function() {$(cols).unbind('mousedown');},
                startRowsDrag: function() {$(rows).bind('mousedown', startRowsDrag);},
                startColsDrag: function() {$(cols).bind('mousedown', startColsDrag);},
                
                addRow: function()
                {
                    var tr = $('<tr>'), length = $(rows).filter('tr:last').children().length, i = 0;
                    
                    do
                    {
                        tr.append( $('<td>') );
                        i++;
                    }
                    while (i < length)
					
                    tr.bind('mousedown', event, startRowsDrag).appendTo(table);
                    rows = tbody.children;
                    getRectCoords();
                    cloneTable.append($('<tr>'));
                },
                
                addCol: function()
                {
                    $(rows).each(function()
                    {
                        $(this).append( $('<td>') );
                    });
                    
                    getRectCoords();
                },
                
                delRow: function(numRow)
                {
                    var num = numRow === undefined ? rows.length - 1 : numRow - 1;

                    $(rows[num]).remove();
                    rows = tbody.children;
                    getRectCoords();
                    cloneTable.children().children().eq(num).remove();
                },
                
                delCol: function(numCol)
                {
                    var num, LENGTH = $(rows[0]).children().length;

                    if (numCol === undefined) {num = LENGTH - 1;}
                    else if (numCol > LENGTH) {return;}
                    else                      {num = numCol - 1;}

                    $(rows).each(function()
                    {
                        $(this).children().eq(num).remove();
                    });

                    cols = $(rows).children().filter('th');
                    getRectCoords();
                },
                
                startEditMode: function()
                {
                    var text, input = null, td, width, height;
                    
                    $(table).delegate('td, th', 'click', function(e)
                    {
                        if ($(this).hasClass('edit-mode-on')) {return false;}
                        
                        if (input !== null) {input.trigger('focusout');}

                        input  = $('<textarea>');
                        td     = $(this).addClass('edit-mode-on');
                        width  = td.width() - 4;
                        height = td.height() - 4;
                        text   = td.text();

                        td.text("").append(input);
                        
                        input
                            .val(text)
                            .focus()
                            .css({display: "block", width: width, height: height})
                            .focusout(function()
                            {
                                text = input.val();
                                input.remove();
                                input = null;
                                td.text(text).removeClass('edit-mode-on');
                            })
                            .keydown(function(e)
                            {
                                if (e.keyCode === 13 || e.keyCode === 27)
                                {
                                    $(this).trigger('focusout');
                                }
                            })
                            .click(function(e)
                            {
                                e.stopPropagation();
                            });
                            
                        e.stopPropagation();
                    });
                },
                
                stopEditMode: function()
                {
                    $(table).unbind('click');
                }
            });
            
            checkEmptyTable(table, tableSorter[tableSorter.length - 1]);
            
        });
    }
})(jQuery);