// Módulo client que llama al API REST usando jQuery GET
const apiclient = (function () {
  // Endpoint base del backend 
  const BASE = "/blueprints";

  // Utilidad para armar URLs seguras
  function byAuthorUrl(author) {
    return BASE + "/" + encodeURIComponent(author);
  }
  function byAuthorAndNameUrl(author, name) {
    return BASE + "/" + encodeURIComponent(author) + "/" + encodeURIComponent(name);
  }

  // Manejador genérico de error para callbacks estilo apimock
  function toErrorCb(errorCb, jqXHR, textStatus, errThrown) {
    if (typeof errorCb === "function") {
      const msg = (jqXHR && (jqXHR.responseText || jqXHR.statusText)) || textStatus || "Error en petición";
      errorCb(new Error(msg));
    }
  }

  return {
    /** Devuelve todos los planos de un autor callback estilo apimock */
    getBlueprintsByAuthor: function (authname, callback, error) {
      $.get(byAuthorUrl(authname))
        .done(function (data) {
          // Array<{author,name,points:[]}>
          callback(data);
        })
        .fail(function (jqXHR, textStatus, errThrown) {
          toErrorCb(error, jqXHR, textStatus, errThrown);
        });
    },

    /** Devuelve un plano por nombre y autor callback estilo apimock */
    getBlueprintsByNameAndAuthor: function (authname, bpname, callback, error) {
      $.get(byAuthorAndNameUrl(authname, bpname))
        .done(function (data) {
          // {author,name,points:[]}
          callback(data);
        })
        .fail(function (jqXHR, textStatus, errThrown) {
          toErrorCb(error, jqXHR, textStatus, errThrown);
        });
    },

    /** Actualiza un plano */
    updateBlueprint: function (author, bpname, blueprint) {
      return $.ajax({
        url: byAuthorAndNameUrl(author, bpname),
        type: 'PUT',
        data: JSON.stringify(blueprint),
        contentType: "application/json"
      });
    },

    /** Crea un nuevo plano  */
    createBlueprint: function (blueprint) {
      return $.ajax({
        url: BASE,
        type: 'POST',
        data: JSON.stringify(blueprint),
        contentType: "application/json"
      });
    },
    
    /** Borra un plano  */
    deleteBlueprint: function(author, bpname) {
      return $.ajax({
        url: byAuthorAndNameUrl(author, bpname),
        type: 'DELETE'
      });
    }
  };
})();