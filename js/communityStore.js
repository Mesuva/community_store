var communityStore = {

    openModal: function(content, animatecart) {
        var whiteout = $(".store-whiteout");

        if (whiteout.length) {
            whiteout.empty().html(content);
        } else {
            $(".ccm-page").append("<div class='store-whiteout'>" + content + "</div>");

            setTimeout(function() {
                $('.store-cart-modal').addClass('store-cart-modal-active');
            }, 10);

            whiteout.click(function(e) {
                if (e.target != this) return; // only allow the actual whiteout background to close the dialog
                communityStore.exitModal();
            });

            $(document).keyup("keyup.communitywhiteout", function(e) {
                if (e.keyCode === 27) {
                    communityStore.exitModal();
                    $(document).unbind("keyup.communitywhiteout");
                }
            });
        }

        if (animatecart) {
            setTimeout(function() {
                $('.store-cart-modal').addClass('store-cart-modal-active');
            }, 30);
        } else {
            $('.store-cart-modal').addClass('store-cart-modal-active');
        }
    },

    updateCartList: function() {
        var cartList = $(".store-checkout-cart-contents").find('#cart');

        if (cartList.length) {
            $.ajax({
                url: CHECKOUTURL + '/getCartList' + TRAILINGSLASH,
                cache: false,
                dataType: 'text',
                success: function (data) {
                    cartList.replaceWith(data);
                }
            });
        }
    },

    waiting: function() {
        communityStore.openModal("<div class='store-spinner-container'><div class='store-spinner'></div></div>");
    },

    exitModal: function() {
        $(".store-whiteout").remove();
    },

    productModal: function(pID, locale) {
        communityStore.waiting();
        $.ajax({
            url: PRODUCTMODAL,
            data: { pID: pID, locale: locale },
            type: 'get',
            cache: false,
            dataType: 'text',
            success: function(modalContent) {
                communityStore.openModal(modalContent);
            }
        });
    },

    displayCart: function(res, animatecart) {
        $.ajax({
            type: "POST",
            cache: false,
            dataType: 'text',
            data: res,
            url: CARTURL + '/getmodal' + TRAILINGSLASH + '?t=' + Date.now(),
            success: function(data) {
                communityStore.openModal(data, animatecart);
            }
        });
    },

    addToCart: function(form) {
        ConcreteEvent.publish('StoreOnBeforeAddToCart', {
            'form': form
        });

        var valid = true;
        var priceinput = $(form).find('.store-product-customer-price-entry-field');

        if (priceinput.length > 0) {
            var max = parseFloat(priceinput.attr('max'));
            var min = parseFloat(priceinput.attr('min'));
            var customerprice = parseFloat(priceinput.val());

            if (customerprice < min || customerprice > max || !isFinite(customerprice)) {
                priceinput.focus();
                valid = false;
            }
        }

        $(form).find('input,textarea,select').filter('[required]').each(function(i, requiredField) {
            if ($(requiredField).val() == '') {
                $(requiredField).focus();
                valid = false;
            }
        });

        if (!valid) {
            return false;
        }

        var qtyfield = $(form).find('.store-product-qty');
        var qty = qtyfield.val();
        if (qty > 0) {
            var serial = $(form).serialize();
            communityStore.waiting();
            $.ajax({
                url: CARTURL + "/add" + TRAILINGSLASH,
                data: serial,
                type: 'post',
                cache: false,
                dataType: 'text',
                success: function(data) {
                    var res = jQuery.parseJSON(data);

                    if (res.product.pAutoCheckout == '1') {
                        window.location.href = CHECKOUTURL;
                        return false;
                    }

                    communityStore.displayCart(res, true);
                    communityStore.refreshCartTotals();
                }
            });
        } else {
            alert(QTYMESSAGE);
            qtyfield.focus();
        }
    },

    //Update a single item in cart
    updateItem: function(instanceID, modal) {
        var qty = $("*[data-instance-id='" + instanceID + "']").find(".store-cart-list-product-qty .form-control").val();
        var ccm_token = $('#store-modal-cart').find('[name=ccm_token]').val();
        //communityStore.waiting();
        $.ajax({
            url: CARTURL + "/update" + TRAILINGSLASH,
            data: { instance: instanceID, pQty: qty, ccm_token: ccm_token },
            type: 'post',
            cache: false,
            dataType: 'text',
            success: function(data) {
                if (modal) {
                    var res = jQuery.parseJSON(data);
                    communityStore.displayCart(res);
                    communityStore.refreshCartTotals();
                }
            }
        });
    },


    //Update multiple item quantities
    updateMultiple: function(instances, quantities, modal) {
        var ccm_token = $('#store-modal-cart').find('[name=ccm_token]').val();

        $.ajax({
            url: CARTURL + "/update" + TRAILINGSLASH,
            data: { instance: instances, pQty: quantities, ccm_token: ccm_token },
            type: 'post',
            cache: false,
            dataType: 'text',
            success: function(data) {
                if (modal) {
                    var res = jQuery.parseJSON(data);
                    communityStore.displayCart(res);
                    communityStore.refreshCartTotals();
                }
            }
        });
    },

    removeItem: function(instanceID, modal) {
        var ccm_token = $('#store-modal-cart').find('[name=ccm_token]').val();
        $.ajax({
            url: CARTURL + "/remove" + TRAILINGSLASH,
            data: { instance: instanceID, ccm_token: ccm_token },
            type: 'post',
            cache: false,
            dataType: 'text',
            success: function(data) {
                if (modal) {
                    var res = jQuery.parseJSON(data);
                    communityStore.displayCart(res);
                    communityStore.refreshCartTotals();
                }
            }
        });
    },

    clearCart: function(modal) {
        var ccm_token = $('#store-modal-cart').find('[name=ccm_token]').val();
        $.ajax({
            url: CARTURL + "/clear" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: { clear: 1, ccm_token: ccm_token },
            success: function(data) {
                communityStore.broadcastCartRefresh({
                    action: 'clear',
                });
                if (modal) {
                    var res = jQuery.parseJSON(data);
                    communityStore.displayCart(res);
                }
                $(".store-utility-links .store-items-counter").text(0);
                $(".store-utility-links .store-total-cart-amount").text("");
                $(".store-utility-links").addClass('store-cart-empty');
            }
        });
    },

    refreshCartTotals: function (callback, nobroadcast) {
        nobroadcast = nobroadcast || false;
        $.ajax({
            url: CARTURL + '/getCartSummary' + TRAILINGSLASH + '?t=' + Date.now(),
            cache: false,
            dataType: 'text',
            success: function (response) {
                var values = $.parseJSON(response);
                var itemCount = values.itemCount;
                var subTotal = values.subTotal;
                var total = values.total;
                var totalCents = values.totalCents;
                var taxes = values.taxes;
                var shippingTotal = values.shippingTotal;
                var shippingTotalRaw = values.shippingTotalRaw;
                if (!nobroadcast) {
                    communityStore.broadcastCartRefresh({
                        action: itemCount > 0 ? 'refresh' : 'clear',
                    });
                }
                if (itemCount == 0) {
                    $(".store-utility-links .store-items-counter").text(0);
                    $(".store-utility-links .store-total-cart-amount").text("");
                    $(".store-utility-links").addClass('store-cart-empty');
                } else {
                    $(".store-utility-links .store-items-counter").text(itemCount);
                    $(".store-cart-grand-total-value").text(subTotal);
                    $(".store-utility-links .store-total-cart-amount").text(subTotal);
                    $(".store-utility-links").removeClass('store-cart-empty');
                }

                if (shippingTotalRaw === false) {
                    $("#shipping-total").text($("#shipping-total").data('unknown-label'));
                } else if (shippingTotalRaw <= 0) {
                    $("#shipping-total").text($("#shipping-total").data('no-charge-label'));
                } else {
                    $("#shipping-total").text(shippingTotal);
                }


                if (taxes.length > 0) {
                    $("#store-taxes").html("").removeClass('d-none hidden');
                    for (var i = 0; i < taxes.length; i++) {
                        if (taxes[i].taxed === true) {
                            $("#store-taxes").append('<li class="store-line-item store-tax-item list-group-item"><strong>' + taxes[i].name + ":</strong> <span class=\"store-tax-amount\">" + taxes[i].taxamount + "</span></li>");
                        }
                    }
                } else {
                    $("#store-taxes").addClass('d-none hidden');
                }

                $(".store-sub-total-amount").text(subTotal);
                $(".store-total-amount").text(total).data('total-cents', totalCents);

                if (callback) {
                    callback();
                }
            }
        });
    },

    broadcastCartRefresh: function (message) {
        if (window.sysend) {
            sysend.broadcast('refresh_cart', message);
        }
    },

    // checkout
    loadViaHash: function() {
        var hash = window.location.hash;
        hash = hash.replace('#', '');
        if (hash != "") {
            $(".store-active-form-group").removeClass('store-active-form-group');
            var pane = $("#store-checkout-form-group-" + hash);
            pane.addClass('store-active-form-group');

            $('html, body').animate({
                scrollTop: pane.offset().top - CHECKOUTSCROLLOFFSET
            });
        }
    },

    updateBillingStates: function(load, callback) {
        var countryCode = $("#store-checkout-billing-country").val();
        var selectedState;
        var classList = $("#store-checkout-billing-state").attr('class').toString();
        var dataList = JSON.stringify($("#store-checkout-billing-state").data());
        if (load) {
            selectedState = $("#store-checkout-saved-billing-state").val();
        } else {
            selectedState = '';
        }

        $.ajax({
            url: HELPERSURL + "/stateprovince/getstates" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: { country: countryCode, selectedState: selectedState, type: "billing", class: classList, data: dataList },
            success: function(states) {
                $("#store-checkout-billing-state").replaceWith(states);
                if (callback) {
                    callback();
                }
            }
        });
    },

    updateShippingStates: function(load, callback) {
        var countryCode = $("#store-checkout-shipping-country").val();
        var selectedState;
        var classList = $("#store-checkout-shipping-state").attr('class').toString();
        var dataList = JSON.stringify($("#store-checkout-shipping-state").data());

        if (load) {
            selectedState = $("#store-checkout-saved-shipping-state").val();
        } else {
            selectedState = '';
        }

        $.ajax({
            url: HELPERSURL + "/stateprovince/getstates" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: { country: countryCode, selectedState: selectedState, type: "shipping", class: classList, data: dataList },
            success: function(states) {
                $("#store-checkout-shipping-state").replaceWith(states);
                if (callback) {
                    callback();
                }
            }
        });
    },

    nextPane: function(obj) {
        if (typeof $(obj)[0].checkValidity === "undefined" || $(obj)[0].checkValidity()) {
            var pane = $(obj).closest(".store-checkout-form-group").find('.store-checkout-form-group-body').parent().next();
            $('.store-active-form-group').removeClass('store-active-form-group');
            pane.addClass('store-active-form-group');
            $(obj).closest(".store-checkout-form-group").addClass('store-checkout-form-group-complete');

            $('html, body').animate({
                scrollTop: pane.offset().top - CHECKOUTSCROLLOFFSET
            });

            pane.find('input').first().focus();


            if (pane[0].id === 'store-checkout-form-group-payment') {
                communityStore.showPaymentMethods();
            }
        }
    },

    showShippingMethods: function(callback) {
        $.ajax({
            url: HELPERSURL + "/shipping/getshippingmethods" + TRAILINGSLASH,
            cache: false,
            dataType: 'text',
            success: function(html) {
                $("#store-checkout-shipping-method-options").html(html);
                $('.store-whiteout').remove();

                if (callback) {
                    callback();
                }
            },
            failure: function() {
                $('.store-whiteout').remove();

                if (callback) {
                    callback();
                }
            }
        });
    },

    showPaymentMethods: function(callback) {
        $.ajax({
            url: HELPERSURL + "/shipping/getpaymentmethods" + TRAILINGSLASH,
            cache: false,
            dataType: 'text',
            success: function(html) {
                $("#store-checkout-payment-method-options").html(html);

                var paymentForm = $("#store-checkout-form-group-payment");
                const evt = new Event('load')
                window.dispatchEvent(evt);
                paymentForm.addClass('payment-form-ready');
                communityStore.showPaymentForm();
                $('.store-whiteout').remove();

            },
            failure: function() {
                $('.store-whiteout').remove();
            }
        });
    },

    showPaymentForm: function() {
        var pmID = $("#store-checkout-payment-method-options input[type='radio']:checked").attr('data-payment-method-id');
        $('.store-payment-method-container').addClass('hidden');
        $(".store-payment-method-container[data-payment-method-id='" + pmID + "']").removeClass('hidden');


    },

    copyBillingToShipping: function() {
        $("#store-checkout-shipping-first-name").val($("#store-checkout-billing-first-name").val());
        $("#store-checkout-shipping-last-name").val($("#store-checkout-billing-last-name").val());
        $("#store-checkout-shipping-email").val($("#store-checkout-billing-email").val());
        $("#store-checkout-shipping-phone").val($("#store-checkout-billing-phone").val());

        if ($("#store-checkout-billing-company")) {
            $("#store-checkout-shipping-company").val($("#store-checkout-billing-company").val());
        }

        $("#store-checkout-shipping-address-1").val($("#store-checkout-billing-address-1").val());
        $("#store-checkout-shipping-address-2").val($("#store-checkout-billing-address-2").val());
        $("#store-checkout-shipping-country").val($("#store-checkout-billing-country").val());
        $("#store-checkout-shipping-city").val($("#store-checkout-billing-city").val());
        var billingstate = $("#store-checkout-billing-state").clone().val($("#store-checkout-billing-state").val()).attr("name", "store-checkout-shipping-state").attr("id", "store-checkout-shipping-state");
        $("#store-checkout-shipping-state").replaceWith(billingstate);
        $("#store-checkout-shipping-zip").val($("#store-checkout-billing-zip").val());
    },

    sortNumber: function(a, b) {
        return a - b;
    },
    hasFormValidation: function() {
        return (typeof document.createElement('input').checkValidity == 'function');
    },
    submitProductFilter: function(element) {
        var filterform = element.closest('form');
        var checkboxes = filterform.find(':checked');
        var search = {};
        var matchtypes = {};

        checkboxes.each(function(index, field) {
            var name = field.name.replace('[]', '');
            var value = encodeURIComponent(field.value);
            var matchtype = field.getAttribute('data-matching');

            if (name in search) {
                search[name].push(value);
            } else {
                search[name] = [value];
                matchtypes[name] = [matchtype === 'or' ? '|' : ';'];
            }
        });

        var strings = [];

        $.each(search, function(key, value) {
            strings.push(key + '=' + value.join(matchtypes[key]));
        });

        var price = filterform.find("[name='price']");

        if (price.length) {
            var min = parseFloat(price.data('min'), 2);
            var max = parseFloat(price.data('max'), 2);

            var pricerange = price.val();

            if (min + '-' + max !== pricerange) {
                strings.push('price=' + price.val());
            }
        }

        var searchstring = strings.join('&');

        var params = {};
        var hasparams = false;

        location.search.substr(1).split("&").forEach(function(item) {
            var key = item.split("=")[0];
            if (key.indexOf('sort') === 0) {
                params[key] = item.split("=")[1];
                hasparams = true;
            }
        });

        if (hasparams) {
            searchstring = searchstring + '&' + $.param(params);
        }

        var id = filterform.attr('id');

        if (id) {
            searchstring += '#' + filterform.attr('id');
        }

        var action = filterform.attr('action')
        if (!action) {
            action = '';
        }

        window.location = action + '?' + searchstring;


    },
    clearProductFilter: function(element) {
        var filterform = element.closest('form');
        var checkboxes = filterform.find(':checked');
        var search = {};

        checkboxes.each(function(index, field) {
            checkboxes.prop('checked', false);
        });

        filterform.find('[name="price"]').val('');

        communityStore.submitProductFilter(element);
    },

    number_format: function (number, decimals, dec_point, thousands_sep) {
        number  = number*1;//makes sure `number` is numeric value
        var str = number.toFixed(decimals?decimals:0).toString().split('.');
        var parts = [];
        for ( var i=str[0].length; i>0; i-=3 ) {
            parts.unshift(str[0].substring(Math.max(0,i-3),i));
        }
        str[0] = parts.join(thousands_sep?thousands_sep:',');
        return str.join(dec_point?dec_point:'.');
    }

};

$(document).ready(function () {
    if (window.sysend) {
        sysend.on('refresh_cart', function (data) {
            var isCart = window.location.href.indexOf(CARTURL);
            var isCheckout = window.location.href.indexOf(CHECKOUTURL);
            if (isCart !== -1 || (data.action == 'clear' && isCheckout !== -1)) {
                // we are on the /cart page
                // or we're on the /checkout page and we just cleared the cart
                // so let's just reload
                // Here we cannot use window.location.reload();
                // otherwise it sends all post values again when on the /cart page
                // and it might alter the cart in unpredictable ways
                // Also if we're on /checkout and the cart is empty the controller would redirect to /cart
                // so let's do it right away to avoid a redirect
                window.location = isCart !== -1 ? window.location : CARTURL;
            } else if (data.action == 'code' && isCheckout !== -1) {
                // we're on the /checkout page and we just added or removed a coupon
                // so let's just reload
                window.location = window.location;
            } else {
                // Let's just update the utility links
                if (isCheckout !== -1) {
                    // we are on the /checkout page so we can update the cart table
                    communityStore.updateCartList();
                }
                communityStore.refreshCartTotals(false, true);
                communityStore.exitModal();
            }
        });
    }

    if ($('.store-checkout-form-shell form').length > 0) {
        communityStore.updateBillingStates(true);
        if ($('#store-checkout-form-group-shipping').length > 0) {
            communityStore.updateShippingStates(true);
            communityStore.showShippingMethods();
        }
        communityStore.showPaymentForm();
    }

    $("#store-checkout-form-group-billing").submit(function(e) {
        e.preventDefault();
        var email = $("#store-email").val();
        var bfName = $("#store-checkout-billing-first-name").val();
        var blName = $("#store-checkout-billing-last-name").val();
        var bPhone = $("#store-checkout-billing-phone").val();

        var bCompany = '';

        if ($("#store-checkout-billing-company")) {
            bCompany = $("#store-checkout-billing-company").val();
        }

        var bAddress1 = $("#store-checkout-billing-address-1").val();
        var bAddress2 = $("#store-checkout-billing-address-2").val();
        var bCountry = $("#store-checkout-billing-country").val();
        var bCity = $("#store-checkout-billing-city").val();
        var bState = $("#store-checkout-billing-state").val();
        var bPostal = $("#store-checkout-billing-zip").val();
        var notes = $("#store-checkout-notes").val();
        $("#store-checkout-form-group-billing .store-checkout-form-group-body .store-checkout-errors").remove();

        var ccm_token = $(this).find('[name=ccm_token]').val();

        if ($('#store-checkout-form-group-billing #store-checkout-form-group-other-attributes').length) {
            //communityStore.processOtherAttributes();
        }

        var fieldData = $(this).serialize() + '&adrType=billing';

        communityStore.waiting();
        var obj = $(this);
        $.ajax({
            url: CHECKOUTURL + "/updater" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: fieldData,
            success: function(result) {
                //var test = null;
                var response = JSON.parse(result);

                if (response.error == false) {

                    if ($('#store-copy-billing').is(":checked")) {
                        communityStore.copyBillingToShipping();
                        $("#store-checkout-form-group-shipping").trigger('submit');
                        $('#store-copy-billing').prop('checked', false)
                    } else {
                        $(".store-whiteout").remove();
                    }

                    obj.find('.store-checkout-form-group-summary .store-summary-name').html(response.first_name + ' ' + response.last_name);
                    obj.find('.store-checkout-form-group-summary .store-summary-phone').html(response.phone);
                    obj.find('.store-checkout-form-group-summary .store-summary-email').html(response.email);
                    obj.find('.store-checkout-form-group-summary .store-summary-address').html(response.address);
                    obj.find('.store-checkout-form-group-summary .store-summary-notes').html(response.notes);
                    obj.find('.store-checkout-form-group-summary .store-summary-company').html(response.company);

                    if (response.attribute_display) {
                        obj.find('#store-attribute-values').show().html(response.attribute_display);
                    } else {
                        obj.find('#store-attribute-values').hide();
                    }


                    if (response.notes) {
                        obj.find('#store-check-notes-container').show();
                    } else {
                        obj.find('#store-check-notes-container').hide();
                    }

                    communityStore.nextPane(obj);
                    communityStore.refreshCartTotals();

                } else {
                    $("#store-checkout-form-group-billing .store-checkout-form-group-body ").prepend('<div class="store-checkout-errors"><div class="store-checkout-error alert alert-danger"></div></div>');
                    $("#store-checkout-form-group-billing .store-checkout-error").html(response.errors.join('<br>'));
                    $('.store-whiteout').remove();
                }
            },
            error: function(data) {
                $(".store-whiteout").remove();
            }
        });

    });

    $("#store-checkout-form-group-shipping").submit(function(e) {
        e.preventDefault();
        var sfName = $("#store-checkout-shipping-first-name").val();
        var slName = $("#store-checkout-shipping-last-name").val();
        var sCompany = '';

        if ($("#store-checkout-shipping-company")) {
            sCompany = $("#store-checkout-shipping-company").val();
        }

        var sAddress1 = $("#store-checkout-shipping-address-1").val();
        var sAddress2 = $("#store-checkout-shipping-address-2").val();
        var sCountry = $("#store-checkout-shipping-country").val();
        var sCity = $("#store-checkout-shipping-city").val();
        var sState = $("#store-checkout-shipping-state").val();
        var sPostal = $("#store-checkout-shipping-zip").val();
        $("#store-checkout-form-group-shipping .store-checkout-form-group-body .store-checkout-errors").remove();

        var ccm_token = $(this).find('[name=ccm_token]').val();

        var fieldData = $(this).serialize() + '&adrType=shipping';

        communityStore.waiting();
        var obj = $(this);
        $.ajax({
            url: CHECKOUTURL + "/updater" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: fieldData,
            //dataType: 'json',
            success: function(result) {
                var response = JSON.parse(result);
                if (response.error == false) {
                    obj.find('.store-checkout-form-group-summary .store-summary-name').html(response.first_name + ' ' + response.last_name);
                    obj.find('.store-checkout-form-group-summary .store-summary-address').html(response.address);
                    obj.find('.store-checkout-form-group-summary .store-summary-company').html(response.company);

                    if (response.vat_number != '') {
                        obj.find('.store-checkout-form-group-summary .store-summary-vat-number').html(response.vat_number);
                    } else {
                        obj.find('.store-checkout-form-group-summary .store-summary-vat-number').html('-');
                    }
                    communityStore.showShippingMethods(function() {
                        communityStore.refreshCartTotals();
                        communityStore.nextPane(obj);
                    });
                } else {
                    $("#store-checkout-form-group-shipping .store-checkout-form-group-body").prepend('<div class="store-checkout-errors"><div class="alert alert-danger"></div></div>');
                    $("#store-checkout-form-group-shipping .alert").html(response.errors.join('<br>'));
                    $('.store-whiteout').remove();
                }
            },
            error: function(data) {
                $(".store-whiteout").remove();
            }
        });

    });

    $("#store-checkout-form-group-vat").submit(function(e) {
        e.preventDefault();
        var vat_number = $("#store-checkout-shipping-vat-number").val();
        $("#store-checkout-form-group-vat .store-checkout-errors").remove();
        var ccm_token = $(this).find('[name=ccm_token]').val();

        communityStore.waiting();
        var obj = $(this);
        $.ajax({
            url: HELPERSURL + "/tax/setvatnumber" + TRAILINGSLASH,
            type: 'post',
            cache: false,
            dataType: 'text',
            data: {
                vat_number: vat_number,
                ccm_token: ccm_token
            },
            success: function(result) {
                //var test = null;
                var response = JSON.parse(result);
                if (response.error == false) {
                    if (response.vat_number != '') {
                        obj.find('.store-checkout-form-group-summary .store-summary-vat-number').html(response.vat_number);
                    } else {
                        obj.find('.store-checkout-form-group-summary .store-summary-vat-number').html(obj.find('.store-checkout-form-group-summary .store-summary-vat-number').data('vat-blank'));
                    }
                    communityStore.refreshCartTotals();
                    communityStore.nextPane(obj);
                    $('.store-whiteout').remove();
                } else {


                    $("#store-checkout-form-group-vat .store-checkout-form-group-body ").prepend('<div class="store-checkout-errors"><div class="store-checkout-error alert alert-danger"></div></div>');
                    $("#store-checkout-form-group-vat .store-checkout-error").html(response.errors.join('<br>'));
                    $('.store-whiteout').remove();
                }
            },
            error: function(data) {
                $(".store-whiteout").remove();
            }
        });

    });

    $("#store-checkout-form-group-shipping-method").submit(function(e) {
        e.preventDefault();
        communityStore.waiting();
        var obj = $(this);
        var ccm_token = $(this).find('[name=ccm_token]').val();

        if ($("#store-checkout-shipping-method-options input[type='radio']:checked").length < 1) {
            $('.store-whiteout').remove();
            alert($('#store-checkout-shipping-method-options').data('error-message'));
        } else {
            var smID = $("#store-checkout-shipping-method-options input[type='radio']:checked").val();
            var methodText = $.trim($("#store-checkout-shipping-method-options input[type='radio']:checked").parent().find('.store-shipping-details').html());
            obj.find('.summary-shipping-method').html(methodText);
            var sInstructions = $('#store-checkout-shipping-instructions').val();
            obj.find('.summary-shipping-instructions').html(sInstructions);

            $.ajax({
                type: 'post',
                cache: false,
                dataType: 'text',
                data: {
                    smID: smID,
                    sInstructions: sInstructions,
                    ccm_token: ccm_token
                },
                url: HELPERSURL + "/shipping/selectshipping" + TRAILINGSLASH,
                success: function(total) {
                    communityStore.refreshCartTotals(function() {
                        communityStore.nextPane(obj);
                        $('.store-whiteout').remove();
                    });
                }
            });

        }
    });

    $(document).on('click', '.store-btn-previous-pane', function(e) {
        //hide the body of the current pane, go to the next pane, show that body.
        var pane = $(this).closest(".store-checkout-form-group").find('.store-checkout-form-group-body').parent().prev();
        $('.store-active-form-group').removeClass('store-active-form-group');
        pane.addClass('store-active-form-group');

        $('html, body').animate({
            scrollTop: pane.parent().offset().top - CHECKOUTSCROLLOFFSET
        });

        $(this).closest(".store-checkout-form-group").prev().removeClass("store-checkout-form-group-complete");
        e.preventDefault();
    });

    $(document).on('change', '#store-checkout-payment-method-options input[type=\'radio\']', function(e) {
        communityStore.showPaymentForm();
    });

    $('#store-cart .store-btn-cart-list-remove').click(function(e) {
        $('#deleteform input[name=instance]').val($(this).data('instance'));
        $('#deleteform').trigger('submit');
        e.preventDefault();
    });

    $(document).on('click', '.store-btn-add-to-cart', function(e) {
        var add = false;

        if ($(this).data('invalid') == '1') {
            $(this).data('invalid', '0');
        } else {

            if (communityStore.hasFormValidation()) {
                if (!$(this).closest('form')[0].checkValidity()) {

                    $(this).data('invalid', '1');
                    $(this).click();
                } else {
                    add = true;
                }
            } else {
                add = true;
            }

            if (add) {
                communityStore.addToCart($(this).closest('form')[0]);
                e.preventDefault();
            }
        }

    });

    $(document).on('submit', '.store-product-block', function(e) {
        if ($(this).find('.store-btn-add-to-cart').length > 0) {
            communityStore.addToCart($(this));
        }
        e.preventDefault();
    });

    $(document).on('click', '.store-price-suggestion', function(e) {
        var productform = $(this).closest('form');
        productform.find('.store-product-customer-price-entry-field').val($(this).data('suggestion-value'));
        communityStore.addToCart(productform);
        e.preventDefault();
    });

    $(document).on('click', '.store-btn-cart-list-remove', function(e) {
        communityStore.removeItem($(this).data('instance-id'), $(this).data('modal'));
        e.preventDefault();
    });

    $('.store-cart-link-modal').click(function(e) {
        communityStore.displayCart(false, true);
        e.preventDefault();
    });

    $(document).on('click', '.store-modal-exit, .store-btn-cart-modal-continue', function(e) {
        communityStore.exitModal();
        e.preventDefault();
    });

    $(document).on('click', '.store-btn-cart-modal-clear', function(e) {
        communityStore.clearCart(true);
        $(this).addClass('disabled');
        e.preventDefault();
    });

    $(document).on('click', '.store-btn-cart-modal-update', function(e) {
        var update = false;

        if ($(this).data('invalid') == '1') {
            $(this).data('invalid', '0');
        } else {
            if (communityStore.hasFormValidation()) {
                if (!$(this).closest('form')[0].checkValidity()) {
                    $(this).data('invalid', '1');
                    $(this).click();
                } else {
                    update = true;
                }
            } else {
                update = true;
            }

            if (update) {
                var instances = $("#store-modal-cart input[name='instance[]']").map(function() {
                    return $(this).val();
                }).get();
                var pQty = $("#store-modal-cart input[name='pQty[]']").map(function() {
                    return $(this).val();
                }).get();

                communityStore.updateMultiple(instances, pQty, true);
                $(this).addClass('disabled');
                e.preventDefault();
            }
        }

    });

    $('.store-cart-modal-link').click(function(e) {
        e.preventDefault();
        communityStore.displayCart(false, true);
    });

    $('.store-btn-filter').click(function(e) {
        e.preventDefault();
        communityStore.submitProductFilter($(this));
    });

    $(document).on('change', '.store-product-filter-block-auto input[type="checkbox"]', function(e) {
        communityStore.submitProductFilter($(this));
    });

    $(document).on('click', '.store-btn-filter-clear', function(e) {
        communityStore.clearProductFilter($(this));
    });

});
