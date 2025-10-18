/* app.js - Módulo controlador siguiendo el patrón Módulo */
const app = (function () {
    // Estado privado 
    let service = null; // apimock o apiclient
    let _animId = null; // ID de animación en curso

    let state = {
        author: null,
        blueprints: [],     
        selected: null,     // Blueprint seleccionado 
        summary: [],        // Resumen de planos (name, pointsCount)
        isCreating: false,  // true si estamos creando un nuevo plano

        // dibujo en canvas 
        lastPointer: null,      // última coordenada capturada { x, y }
        onCanvasClick: null,  // callback  al hacer click/tap en el canvas
        drawing: {
            isDown: false,  // mouse está presionado
            last: null      // última posición conocida
        }
    };

    /** Limpia el canvas */
    function clearCanvas(canvasId = "bpCanvas") {
        const canvas = document.getElementById(canvasId) || document.querySelector("canvas");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    /** Validación de configurar primero el servicio */
    function ensureService() {
        if (!service) throw new Error("Servicio no configurado. Llame a app.setService(svc) primero");
    }

    /** Conteo de puntos por plano */
    function toSummary(list) {
        return (list || []).map(bp => ({
            name: bp.name,
            pointsCount: bp?.points?.length ?? 0
        }));
    }

    /** Cambio de autor y limpieza de estado */
    function setAuthorInternal(authorName) {
        if (!authorName?.trim()) throw new Error("Autor inválido");
        state.author = authorName.trim();
        state.selected = null;
        state.blueprints = [];
        state.summary = [];
        state.isCreating = false; // Resetea modo creación
    }

    /** Sincroniza el selected en el arreglo blueprints y en summary, solo en memoria */
    function syncSelected() {
        if (!state.selected || state.isCreating) return; // No sincronizar si es un plano nuevo no guardado
        const { name } = state.selected;
        const idx = state.blueprints.findIndex(b => b.name === name && b.author === state.author);
        if (idx >= 0) state.blueprints[idx] = state.selected;

        const sIdx = state.summary.findIndex(s => s.name === name);
        if (sIdx >= 0) state.summary[sIdx] = { name, pointsCount: state.selected.points.length };
    }

    /** Posición relativa al canvas */
    function getCanvasRelativePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        const clientX = (typeof evt?.clientX === "number") ? evt.clientX : evt?.touches?.[0]?.clientX;
        const clientY = (typeof evt?.clientY === "number") ? evt.clientY : evt?.touches?.[0]?.clientY;
        if (clientX == null || clientY == null) return null;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: Math.round((clientX - rect.left) * scaleX),
            y: Math.round((clientY - rect.top)  * scaleY)
        };
    }

    /** Dibuja un segmento en el canvas */
    function drawSegment(ctx, from, to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }
    /** Repinta el blueprint seleccionado */
    function repaintSelected(canvasId = "bpCanvas") {
        if (!state.selected) return;
        const canvas = document.getElementById(canvasId) || document.querySelector("canvas");
        if (!canvas) return;
        if (_animId) { clearInterval(_animId); _animId = null; }

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pts = state.selected.points || [];
        if (pts.length < 2) return;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        pts.forEach((p, i) => {
            if (i === 0) return;
            drawSegment(ctx, pts[i - 1], p);
        });
    }
    /** Agrega un punto al blueprint seleccionado y repinta */
    function addPointToSelected(pos, canvasId = "bpCanvas") {
        if (!state.selected) return;
        if (!Array.isArray(state.selected.points)) state.selected.points = [];
        state.selected.points.push({ x: pos.x, y: pos.y });
        syncSelected();
        repaintSelected(canvasId);
    }

    /** DOWN: Inicia el trazo */
    function handleCanvasPointerDown(evt) {
        if (evt?.cancelable) evt.preventDefault();
        if (!state.selected) return;
        const canvas = evt.currentTarget;
        const pos = getCanvasRelativePos(canvas, evt);
        if (!pos) return;
        state.lastPointer = pos;
        state.drawing.isDown = true;
        state.drawing.last = pos;
        addPointToSelected(pos, canvas.id);
        if (typeof state.onCanvasClick === "function") {
            try { state.onCanvasClick(pos); } catch (e) { console.error(e); }
        }
    }

    /** MOVE: si esta presionado, dibujar segmentos consecutivos */
    function handleCanvasPointerMove(evt) {
        if (!state.drawing.isDown) return;
        if (evt?.cancelable) evt.preventDefault();
        if (!state.selected) return;
        const canvas = evt.currentTarget;
        const pos = getCanvasRelativePos(canvas, evt);
        if (!pos) return;
        state.lastPointer = pos;
        state.drawing.last = pos;
        addPointToSelected(pos, canvas.id);
    }

    /** UP: Finaliza el trazo */
    function handleCanvasPointerUp(evt) {
        if (evt?.cancelable) evt.preventDefault();
        state.drawing.isDown = false;
        state.drawing.last = null;
    }

    /** Adjunta los manejadores de puntero al canvas */
    function attachCanvasHandlers(canvasId = "bpCanvas") {
        const canvas = document.getElementById(canvasId) || document.querySelector("canvas");
        if (!canvas) { console.warn(`[app] Canvas "${canvasId}" no encontrado.`); return; }
        detachCanvasHandlers(canvas);
        if (window.PointerEvent) {
            canvas.addEventListener("pointerdown", handleCanvasPointerDown, { passive: false });
            canvas.addEventListener("pointermove", handleCanvasPointerMove, { passive: false });
            canvas.addEventListener("pointerup", handleCanvasPointerUp, { passive: false });
            canvas.addEventListener("pointerleave", handleCanvasPointerUp, { passive: false });
            canvas.addEventListener("pointercancel", handleCanvasPointerUp, { passive: false });
        } else {
            canvas.addEventListener("mousedown", handleCanvasPointerDown, { passive: false });
            canvas.addEventListener("mousemove", handleCanvasPointerMove, { passive: false });
            canvas.addEventListener("mouseup", handleCanvasPointerUp, { passive: false });
            canvas.addEventListener("mouseleave", handleCanvasPointerUp, { passive: false });
            canvas.addEventListener("touchstart", handleCanvasPointerDown, { passive: false });
            canvas.addEventListener("touchmove", handleCanvasPointerMove, { passive: false });
            canvas.addEventListener("touchend", handleCanvasPointerUp, { passive: false });
            canvas.addEventListener("touchcancel", handleCanvasPointerUp, { passive: false });
        }
        canvas.style.touchAction = "none";
    }
    /** Desadjunta los manejadores de puntero del canvas */
    function detachCanvasHandlers(canvasOrId = "bpCanvas") {
        const canvas = (typeof canvasOrId === "string")
            ? (document.getElementById(canvasOrId) || document.querySelector("canvas"))
            : canvasOrId;
        if (!canvas) return;
        if (window.PointerEvent) {
            canvas.removeEventListener("pointerdown", handleCanvasPointerDown);
            canvas.removeEventListener("pointermove", handleCanvasPointerMove);
            canvas.removeEventListener("pointerup", handleCanvasPointerUp);
            canvas.removeEventListener("pointerleave", handleCanvasPointerUp);
            canvas.removeEventListener("pointercancel", handleCanvasPointerUp);
        } else {
            canvas.removeEventListener("mousedown", handleCanvasPointerDown);
            canvas.removeEventListener("mousemove", handleCanvasPointerMove);
            canvas.removeEventListener("mouseup", handleCanvasPointerUp);
            canvas.removeEventListener("mouseleave", handleCanvasPointerUp);
            canvas.removeEventListener("touchstart", handleCanvasPointerDown);
            canvas.removeEventListener("touchmove", handleCanvasPointerMove);
            canvas.removeEventListener("touchend", handleCanvasPointerUp);
            canvas.removeEventListener("touchcancel", handleCanvasPointerUp);
        }
    }

    // Controlador público 
    return {
        /** Define el proveedor de datos (apiclient) */
        setService(svc) { service = svc; return this; },

        /** Dibuja un plano por autor y nombre, entrando en modo edición */
        drawByAuthorAndName(authorName, bpName, canvasId = "bpCanvas") {
            ensureService();
            
            service.getBlueprintsByNameAndAuthor(authorName, bpName, (bp) => {
                if (!bp) { alert("Blueprint no encontrado"); return; }
                state.author = authorName;
                state.selected = bp;
                state.isCreating = false; // Estamos editando un plano existente

                $("#current-blueprint-name").text(`Current blueprint: ${bp.name}`);
                repaintSelected(canvasId); 
            }, (err) => {
                alert((err && err.message) || "Error obteniendo el blueprint");
            });
        },
        
        /** Actualiza la lista de planos del autor */
        updateBlueprintsListByAuthor(authorName) {
            ensureService();
            const author = (authorName || "").trim();
            if (!author) throw new Error("Autor inválido");

            service.getBlueprintsByAuthor(author, (list) => {
                setAuthorInternal(author); // Resetea el estado para el nuevo autor
                state.blueprints = Array.isArray(list) ? list : [];
                
                const simple = toSummary(state.blueprints);     
                state.summary = simple;

                const $tbody = $("#blueprints-table-body").empty();
                simple.map(row => {
                    const $tr = $("<tr></tr>");
                    $tr.append($("<td></td>").text(row.name));
                    $tr.append($("<td></td>").text(row.pointsCount));
                    const $btn = $("<button class='btn btn-sm btn-outline-primary'>Open</button>").on("click", () => {
                        this.drawByAuthorAndName(author, row.name, "bpCanvas");
                    });
                    $tr.append($("<td></td>").append($btn));
                    $tbody.append($tr);
                });

                const total = simple.reduce((acc, r) => acc + (r.pointsCount || 0), 0);
                $("#nameAuthorSelected").text(`${author}'s blueprints:`);
                $("#totalPoints").text(String(total));
            }, () => {
                // Manejo de error si el autor no se encuentra
                $("#blueprints-table-body").empty();
                $("#nameAuthorSelected").text(`${author}'s blueprints: (No planos encontrados)`);
                $("#totalPoints").text("0");
                setAuthorInternal(author);
            });
        },

        /** Prepara el canvas para un nuevo plano */
        prepareNewBlueprint() {
            if (!state.author) {
                alert("Por favor ingrese un autor antes de crear un nuevo plano.");
                return;
            }
            const newBpName = prompt("Ingrese el nombre para el nuevo plano:");
            if (!newBpName || newBpName.trim() === "") {
                alert("El nombre del plano no puede estar vacío.");
                return;
            }

            state.isCreating = true;
            state.selected = { author: state.author, name: newBpName.trim(), points: [] };

            clearCanvas();
            $("#current-blueprint-name").text(`New Blueprint: ${state.selected.name}`);
        },

        /** Guarda o actualiza  el plano actual */
        saveOrUpdateBlueprint() {
            ensureService();
            if (!state.selected || !state.author) {
                alert("No se ha seleccionado un plano para guardar.");
                return;
            }

            let promise;
            if (state.isCreating) {
                // Hace POST y luego GET para actualizar
                promise = service.createBlueprint(state.selected);
            } else {
                // Hace PUT
                promise = service.updateBlueprint(state.author, state.selected.name, state.selected);
            }

            promise.then(() => {
                this.updateBlueprintsListByAuthor(state.author); // Actualiza la lista y los puntos
                
                // Si estábamos creando, pasamos a modo edición sobre el plano recién creado
                if (state.isCreating) {
                    state.isCreating = false;
                    $("#current-blueprint-name").text(`Current blueprint: ${state.selected.name}`);
                }
            }).fail((jqXHR) => {
                const errorMsg = (jqXHR && (jqXHR.responseText || jqXHR.statusText)) || "Error guardando el plano";
                alert(`Error: ${errorMsg}`);
            });
        },

        /** Borra el plano seleccionado actualmente */
        deleteSelectedBlueprint() {
            ensureService();
            if (!state.selected || state.isCreating) {
                alert("No hay un plano existente seleccionado para borrar.");
                return;
            }
            if (!confirm(`¿Está seguro de que desea borrar el plano '${state.selected.name}'?`)) {
                return;
            }

            service.deleteBlueprint(state.author, state.selected.name)
                .then(() => {
                    alert("Plano borrado exitosamente.");
                    state.selected = null;
                    clearCanvas();
                    $("#current-blueprint-name").text("Current blueprint:");
                    this.updateBlueprintsListByAuthor(state.author); // Refresca la lista y los puntos
                })
                .fail((jqXHR) => {
                    const errorMsg = (jqXHR && (jqXHR.responseText || jqXHR.statusText)) || "Error borrando el plano.";
                    alert(`Error: ${errorMsg}`);
                });
        },
        
        attachCanvasHandlers,
        detachCanvasHandlers
    };
})();
/* Conexión a la vista existente */
document.addEventListener("DOMContentLoaded", () => {
    app.setService(apiclient);    
    app.attachCanvasHandlers("bpCanvas");

    $("#getBlueprints").on("click", () => {
        const author = ($("#author").val() || "").trim();
        if (!author) return alert("Por favor ingrese un autor.");
        app.updateBlueprintsListByAuthor(author);
    });

    $("#createBlueprint").on("click", () => {
        app.prepareNewBlueprint();
    });

    $("#saveBlueprint").on("click", () => {
        app.saveOrUpdateBlueprint();
    });
    $("#deleteBlueprint").on("click", () => {
        app.deleteSelectedBlueprint();
    });
});