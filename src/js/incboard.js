/**
 * incboard.js
 *
 * @package IncBoardJS
 * @version 1.0
 * Copyright (C) 2010-2013  Diogo Oliveira de Melo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function ($, undefined) {
    function IncBoard() {
        this.shiftList = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
        this.ibb = new $.IncBoardBoard();
        this.stochasticLength = 0;
        this.clean();
        this.log = new Log();
    }

    IncBoard.prototype.clean = function () {
        this.pos = 0;
        this.similarity = null;
        this.ibb.clean();
    };

    IncBoard.prototype.getIdList = function() {
        return this.ibb.getIdList();
    };

    IncBoard.prototype.posGreaterThan = function(posA, posB) {
        var maxA = Math.max(Math.abs(posA[0]), Math.abs(posA[1])),
            maxB = Math.max(Math.abs(posB[0]), Math.abs(posB[1])),
            qA,
            qB,
            sumA,
            sumB;

        if (maxA !== maxB) {
            return maxA > maxB;
        } else {
            qA = posA[1] === -maxA || posA[0] === maxA ? 0 : 1;
            qB = posB[1] === -maxA || posB[0] === maxA ? 0 : 1;

            if (qA !== qB) {
                return qA > qB;
            } else {
                sumA = posA[0] + posA[1];
                sumB = posB[0] + posB[1];
                if (0 === qA) {
                    return sumA > sumB;
                } else {
                    return sumB > sumA;
                }
            }
        }
    };

    IncBoard.prototype.stochasticItems = function(center) {
        var start = new Date().getTime();
        var self = this,
            list = [],
            idList = this.ibb.getIdList(),
            totalLength = idList.length;

        for (var key in this.ibb.getByPos(center)) {
            var item = this.ibb.getByPos(center)[key],
                id = parseInt(item.objId);
            list.push(id);
            idList.splice(idList.indexOf(id), 1);
        }

        this.shiftList.forEach(function(shift) {
            var pos = [center[0] + shift[0], center[1] + shift[1]];
            for (var key in self.ibb.getByPos(pos)) {
                var item = self.ibb.getByPos(pos)[key],
                    id = parseInt(item.objId);

                if (-1 === list.indexOf(id)) {
                    list.push(id);
                    idList.splice(idList.indexOf(id), 1);
                }
            }
        });

        while (list.length < this.stochasticLength * totalLength && idList.length > 0) {
            var rid = Math.floor(Math.random() * idList.length),
                id = parseInt(idList[rid]);

            if (-1 === list.indexOf(id)) {
                list.push(id);
                idList.splice(rid, 1);
            }
        }

        var end = new Date().getTime();

        return list;
    }

    /**
     * @param music The entire music object.
     * @param musicList a list of Obj IDs.
     */
    IncBoard.prototype.get2DRank = function(music, musicList) {
        var center = this.ibb.getPos(music.objId),
            list = [],
            rank = [],
            self = this,
            i,
            j,
            countSort = [];

        for (var key in musicList) {
            var id = musicList[key],
                a = [],
                pos =  self.ibb.getPos(id),
                p = Math.max(Math.abs(pos[0] - center[0]), Math.abs(pos[1] - center[1]));

            if (!(p in countSort)) {
                countSort[p] = [];
            }
            countSort[p].push(id);
        }

        for (var i in countSort) {
            for (var j in countSort[i]) {
                rank.push(countSort[i][j]);
            }
        }

        return rank;
    }

    IncBoard.prototype.getNDRank = function(music, musicList) {
        var rank = new Array(),
            objId = music.objId,
            rank = new Array(),
            self = this,
            countSort = [];

        for (var key in musicList) {
            var id = musicList[key],
                p = self.similarity[objId][id];

            if (!(p in countSort)) {
                countSort[p] = [];
            }
            countSort[p].push(id);
        }

        for (var i in countSort) {
            for (var j in countSort[i]) {
                rank.push(countSort[i][j]);
            }
        }

        /*
        console.log("getNDRank");
        for (var i in rank) {
            console.log("id: " + rank[i] + ". similarity: " + self.similarity[objId][rank[i]]);
        }
        */

        return rank;
    }

    // Calculate Werr of element v.
    IncBoard.prototype.calcError = function(v, musicList) {
        var s0 = new Date().getTime(),
            werr = 0,
            rank2D = this.get2DRank(v, musicList),
            s1 = new Date().getTime(),
            rankND = this.getNDRank(v, musicList),
            s2 = new Date().getTime(v),
            rN = 0,
            self = this;

        for (var r2 in rank2D) {
            var item = rank2D[r2];
            rN = rankND.indexOf(item);
            if (rN != r2) {
                werr += Math.abs((rN - r2) * (self.ibb.getSize() - rN));
            }
        }

        var s3 = new Date().getTime();

        return werr;
    }

    IncBoard.prototype.calcCountingError = function(v, musicList) {
        var cerr = 0,
            rank2D = this.get2DRank(v, musicList),
            rankND = this.getNDRank(v, musicList),
            rN = 0,
            self = this;

        for (var r2 in rank2D) {
            var item = rank2D[r2];
            rN = rankND.indexOf(item);
            if (rN != r2) {
                cerr += musicList.length - rN;
            }
        }

        return cerr;
    }

    IncBoard.prototype.resolveConflict = function(mostSimilar, newMusic, visitedCells) {
        var self = this;

        // self.log.debug("resolveConflict " + mostSimilar.objId + " " + newMusic.objId + ": " + visitedCells);
        if ('undefined' === typeof mostSimilar || 'undefined' === typeof newMusic) {
        }

        var ncPos = this.ibb.getPos(newMusic.objId),
            bestMsPos = null,
            bestNcPos = null,
            bestWerr = 10000000,
            bestState = 0,
            occupancy = 1000,
            bestCountingError = 1000000000,
            musicList = this.stochasticItems(ncPos);


        [0, 1].forEach(function(state) {
            self.shiftList.forEach(function(shift) {
                var pos = [ncPos[0] + shift[0], ncPos[1] + shift[1]];
                if (-1 === visitedCells.indexOf(self.ibb.posToInt(pos))) {
                    var currentWerr;
                    if(0 == state) {
                        self.ibb.setPos(mostSimilar.objId, ncPos);
                        self.ibb.setPos(newMusic.objId, pos);
                        // currentWerr = self.calcError(newMusic, pos);
                    } else {
                        self.ibb.setPos(mostSimilar.objId, pos);
                        self.ibb.setPos(newMusic.objId, ncPos);
                        // currentWerr = self.calcError(mostSimilar, pos);
                    }

                    // TODO: verify if this is correct or if Werr = Werr(newMusic) + Werr(mostSimilar).
                    currentWerr = self.calcError(newMusic, musicList) + self.calcError(mostSimilar, musicList);
                    countingError = null;
                    if(currentWerr <= bestWerr) {
                        var skip = false;


                        if (currentWerr == bestWerr) {
                            console.log("COUNTING ERROR WAS USED");
                            countingError = self.calcCountingError(newMusic, musicList) + self.calcCountingError(mostSimilar, musicList);
                            if (countingError >= bestCountingError) {
                                skip = true;
                            }
                        }
                        if (!skip) {
                            bestWerr = currentWerr;
                            bestCountingError = null === countingError ? bestCountingError : countingError;
                            bestMsPos = self.ibb.getPos(mostSimilar.objId);
                            bestNcPos = self.ibb.getPos(newMusic.objId);
                            bestState = state;
                            occupancy = self.ibb.isPosOccupied(pos);
                        }
                    }
                }
            });
        });


        if (null !== bestNcPos && null !== bestMsPos) {
            this.ibb.setPos(newMusic.objId, bestNcPos);
            this.ibb.setPos(mostSimilar.objId, bestMsPos);

            var externalCell = 0 === bestState ? newMusic : mostSimilar;
            var pos = this.ibb.getPos(externalCell.objId);
            if (this.ibb.isPosOccupied(pos) >= 2) {
                visitedCells.push(this.ibb.posToInt(this.ibb.getPos(newMusic.objId)));
                visitedCells.push(this.ibb.posToInt(this.ibb.getPos(mostSimilar.objId)));

                var conflictList = this.ibb.getByPos(pos),
                    first = conflictList[0],
                    second = conflictList[1];

                this.resolveConflict(first, second, visitedCells);
            }
        } else { // otherwise the cell is trapped.
            console.log("Cell is trapped: ");
            console.log(newMusic);
        }
    }

    /**
     *  Insert the object (music or album) on the incBoard.
     */
    IncBoard.prototype.insert = function(v) {
        var maxSimilarity = -1,
            mostSimilar = null,
            nSwitches = 0,
            self = this,
            ret,
            rand = Math.floor(Math.random() * 1000);

        // console.log('INSERT ' + v.objId + ' - ' + rand + ' BEGIN');

        // Verify if element ins't already inserted.
        if (this.ibb.getByObjId(v.objId) !== undefined) {
            ret = false;
        } else {
            // Find the most similar element already on incBoard.
            for (var objId in this.ibb.getAllMusic()) {
                var e = this.ibb.getAllMusic()[objId];

                if (objId in self.similarity && v.objId in self.similarity[objId] && maxSimilarity < self.similarity[objId][v.objId]) {
                    maxSimilarity = self.similarity[objId][v.objId];
                    mostSimilar = e;
                    nSwitches++;
                } else if (!(objId in self.similarity)) {
                    self.log.debug("AAAAA objId not in similarity " + objId);
                } else if (!(v.objId in self.similarity[objId])) {
                    self.log.debug("AAAAA v.objId not in similarity[objId] #" + v.objId + "# #" + objId + "#");
                }
            }

            if(null !== mostSimilar) {
                this.ibb.insert(v, this.ibb.getPos(mostSimilar.objId));
                this.resolveConflict(mostSimilar, v, []);
            } else {
                console.log("Found no similar element");
                this.ibb.insert(v);
            }

            this.ibb.removeOutOfBorder();
            this.ibb.centralizeItems();
            this.ibb.flushDraw();
            ret = true;
        }
        // console.log('INSERT ' + v.objId + ' - ' + rand + ' END');

        return ret;
    }

    IncBoard.prototype.posToString = function (pos) {
        return "(" + pos[0] + "," + pos[1] + ")";
    };

    IncBoard.prototype.quality = function() {
        var idList = this.ibb.getIdList(),
            total = 0,
            self = this;

        for (var i in idList) {
            console.log(idList[i]);
            var item = this.ibb.getByObjId(idList[i]),
                center = item.getPos();
            $.item = item;


            this.shiftList.forEach(function(shift) {
                var pos = [center[0] + shift[0], center[1] + shift[1]];
                for (var key in self.ibb.getByPos(pos)) {
                    var item2 = self.ibb.getByPos(pos)[key],
                        item = $.item.content;

                    total += self.similarity[item.objId][item2.objId];
                }
            });
        }

        return parseInt(total / this.ibb.getIdList().length);
    }

    $.IncBoard = IncBoard;

}(jQuery, undefined));
